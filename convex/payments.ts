/// <reference types="node" />
import { v, ConvexError } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/guards";

export const createTransaction = action({
  args: {
    orderId: v.id("orders"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Call an internal query to validate role and get user
    const user = await ctx.runQuery(internal.payments.getConsumerUser, { sessionToken: args.sessionToken });
    
    // Validate order via an internal query (since action can't read db directly without runQuery)
    const orderData: any = await ctx.runQuery(internal.payments.getOrderForPayment, { orderId: args.orderId });
    
    if (!orderData) {
      throw new ConvexError("Pesanan tidak ditemukan.");
    }
    if (orderData.userId !== user._id) {
      throw new ConvexError("Anda tidak memiliki akses ke pesanan ini.");
    }
    if (orderData.status !== "reserved") {
      throw new ConvexError("Pesanan tidak dalam status reservasi.");
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

    const data: any = await response.json();

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

export const getConsumerUser = internalQuery({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await requireRole(ctx, args.sessionToken, ["consumer"]);
  },
});
