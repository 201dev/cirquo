/// <reference types="node" />
import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/guards";

const PAYMENT_HOLD_MS = 15 * 60 * 1_000;

type PaymentOrder = {
  userId: Id<"users">;
  surplusItemId: Id<"surplusItems">;
  totalPrice: number;
  status: "reserved" | "paid" | "picked_up" | "cancelled" | "expired";
  createdAt: number;
  paymentHoldExpiresAt?: number;
  itemName: string;
};

type CreateTransactionResult = {
  snapToken: string;
  redirectUrl: string;
  orderReference: Id<"orders">;
  amount: number;
  paymentHoldExpiresAt: number;
};

type RefundRequest = { amount: number; refundKey: string };
type RefundActionResult = { status: "skipped" | "succeeded" | "failed" };

export const createTransaction = action({
  args: {
    orderId: v.id("orders"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CreateTransactionResult> => {
    // Call an internal query to validate role and get user
    const user = await ctx.runQuery(internal.payments.getConsumerUser, { sessionToken: args.sessionToken });
    
    // Validate order via an internal query (since action can't read db directly without runQuery)
    const orderData = await ctx.runQuery(
      internal.payments.getOrderForPayment,
      { orderId: args.orderId },
    ) as PaymentOrder | null;
    
    if (!orderData) {
      throw new ConvexError("Pesanan tidak ditemukan.");
    }
    if (orderData.userId !== user._id) {
      throw new ConvexError("Anda tidak memiliki akses ke pesanan ini.");
    }
    if (orderData.status !== "reserved") {
      throw new ConvexError("Pesanan tidak dalam status reservasi.");
    }
    const paymentHoldExpiresAt = orderData.paymentHoldExpiresAt ?? orderData.createdAt + PAYMENT_HOLD_MS;
    if (paymentHoldExpiresAt <= Date.now()) {
      throw new ConvexError("Waktu pembayaran telah habis.");
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      throw new ConvexError("Midtrans server key tidak dikonfigurasi.");
    }

    const authString = btoa(serverKey + ":");
    const payload = {
      transaction_details: {
        order_id: args.orderId,
        gross_amount: orderData.totalPrice,
      },
      item_details: [
        {
          id: orderData.surplusItemId,
          price: orderData.totalPrice,
          quantity: 1, // We treat the whole order as 1 package in Midtrans for simplicity
          name: orderData.itemName.substring(0, 50),
        }
      ],
      customer_details: {
        first_name: user.name,
        email: user.email,
        phone: user.phone || "080000000000",
      },
      callbacks: {
        finish: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/orders/${args.orderId}`
      }
    };

    const response: Response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Midtrans API Error:", errorText);
      throw new ConvexError("Gagal membuat transaksi pembayaran.");
    }

    const data: { token?: unknown; redirect_url?: unknown } = await response.json();
    if (typeof data.token !== "string" || typeof data.redirect_url !== "string") {
      throw new ConvexError("Respons Midtrans tidak valid.");
    }

    // Persist pending payment context
    await ctx.runMutation(internal.payments.savePendingTransaction, {
      orderId: args.orderId,
      amount: orderData.totalPrice,
    });

    return {
      snapToken: data.token,
      redirectUrl: data.redirect_url,
      orderReference: args.orderId,
      amount: orderData.totalPrice,
      paymentHoldExpiresAt,
    };
  },
});

export const getOrderForPayment = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    
    const item = await ctx.db.get(order.surplusItemId);
    return {
      ...order,
      itemName: item?.name || "Rescue Item",
    };
  },
});

export const savePendingTransaction = internalMutation({
  args: {
    orderId: v.id("orders"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
      
    if (!existing) {
      await ctx.db.insert("payments", {
        orderId: args.orderId,
        provider: "midtrans",
        amount: args.amount,
        providerStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getPendingSandboxRefund = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
    if (!payment || payment.refundStatus !== "pending" || !payment.refundKey) return null;
    return { amount: payment.amount, refundKey: payment.refundKey };
  },
});

export const completeSandboxRefund = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
    if (!payment || payment.refundStatus !== "pending") return;

    const now = Date.now();
    await ctx.db.patch(payment._id, {
      refundStatus: args.status,
      refundCompletedAt: now,
      refundError: args.status === "failed" ? args.error ?? "Refund Midtrans gagal." : undefined,
      updatedAt: now,
    });
  },
});

export const requestSandboxRefund = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<RefundActionResult> => {
    const refund = await ctx.runQuery(internal.payments.getPendingSandboxRefund, args) as RefundRequest | null;
    if (!refund) return { status: "skipped" as const };

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      await ctx.runMutation(internal.payments.completeSandboxRefund, {
        orderId: args.orderId,
        status: "failed",
        error: "Midtrans server key tidak dikonfigurasi.",
      });
      return { status: "failed" as const };
    }

    try {
      const response: Response = await fetch(
        `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(args.orderId)}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${btoa(`${serverKey}:`)}`,
          },
          body: JSON.stringify({
            refund_key: refund.refundKey,
            amount: refund.amount,
            reason: "pickup_window_expired",
          }),
        },
      );
      await ctx.runMutation(internal.payments.completeSandboxRefund, {
        orderId: args.orderId,
        status: response.ok ? "succeeded" : "failed",
        error: response.ok ? undefined : `Midtrans refund ditolak (HTTP ${response.status}).`,
      });
      return { status: response.ok ? "succeeded" as const : "failed" as const };
    } catch {
      await ctx.runMutation(internal.payments.completeSandboxRefund, {
        orderId: args.orderId,
        status: "failed",
        error: "Permintaan refund Midtrans tidak dapat dikirim.",
      });
      return { status: "failed" as const };
    }
  },
});

export const getConsumerUser = internalQuery({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await requireRole(ctx, args.sessionToken, ["consumer"]);
  },
});
