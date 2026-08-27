import { httpAction, internalMutation } from "./_generated/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { recordLedgerEvent } from "./lib/ledger";
import { isValidMidtransSignature, parseMidtransIdrAmount } from "./lib/midtrans";
import { v } from "convex/values";

type MidtransWebhookPayload = {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  payment_type?: unknown;
  transaction_id?: unknown;
};

const midtransWebhook = httpAction(async (ctx, request) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return new Response("Server key not configured", { status: 500 });
  }

  let payload: MidtransWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_status: transactionStatus,
    payment_type: paymentType,
    transaction_id: transactionId,
  } = payload;

  if (
    typeof orderId !== "string" ||
    typeof statusCode !== "string" ||
    typeof grossAmount !== "string" ||
    typeof signatureKey !== "string" ||
    typeof transactionStatus !== "string" ||
    typeof transactionId !== "string"
  ) {
    return new Response("Invalid webhook payload", { status: 400 });
  }

  const isValid = await isValidMidtransSignature(orderId, statusCode, grossAmount, serverKey, signatureKey);

  if (!isValid) {
    console.error("Invalid signature for order:", orderId);
    return new Response("Invalid signature", { status: 403 });
  }
  await ctx.runMutation(internal.http.handleWebhook, {
    orderId: orderId as Id<"orders">,
    grossAmount,
    transactionStatus,
    paymentType: typeof paymentType === "string" ? paymentType : "unknown",
    transactionId,
    rawPayload: JSON.stringify(payload),
  });

  return new Response("OK", { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/midtrans/webhook",
  method: "POST",
  handler: midtransWebhook,
});

export default http;

export const handleWebhook = internalMutation({
  args: {
    orderId: v.string(), // accepting string because it comes from external payload, but we'll cast/verify it
    grossAmount: v.string(),
    transactionStatus: v.string(),
    paymentType: v.string(),
    transactionId: v.string(),
    rawPayload: v.string(),
  },
  handler: async (ctx, args) => {
    // Standardize convex ID
    const normalizedOrderId = ctx.db.normalizeId("orders", args.orderId);
    if (!normalizedOrderId) {
      console.warn("Invalid order ID from webhook:", args.orderId);
      return;
    }

    const order = await ctx.db.get(normalizedOrderId);
    if (!order) {
      console.warn("Order not found:", args.orderId);
      return;
    }
    if (parseMidtransIdrAmount(args.grossAmount) !== order.totalPrice) {
      console.warn("Webhook amount does not match order:", args.orderId);
      return;
    }

    const paymentForProviderTransaction = await ctx.db
      .query("payments")
      .withIndex("by_provider_txn", (q) => q.eq("providerTxnId", args.transactionId))
      .unique();
    if (paymentForProviderTransaction && paymentForProviderTransaction.orderId !== normalizedOrderId) {
      console.warn("Provider transaction already belongs to another order:", args.transactionId);
      return;
    }

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", normalizedOrderId))
      .first();

    if (payment) {
      await ctx.db.patch(payment._id, {
        providerStatus: args.transactionStatus,
        paymentMethod: args.paymentType,
        providerTxnId: args.transactionId,
        rawPayload: args.rawPayload,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("payments", {
        orderId: normalizedOrderId,
        provider: "midtrans",
        amount: order.totalPrice, // In theory we should verify gross_amount matches this, but signature handles tampering
        providerStatus: args.transactionStatus,
        paymentMethod: args.paymentType,
        providerTxnId: args.transactionId,
        rawPayload: args.rawPayload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Only process 'settlement' or 'capture' for paid transition
    if (args.transactionStatus === "settlement" || args.transactionStatus === "capture") {
      if (order.status === "reserved") {
        await ctx.db.patch(normalizedOrderId, {
          status: "paid",
        });

        // Write PAID ledger event
        await recordLedgerEvent(ctx, {
          surplusItemId: order.surplusItemId,
          orderId: normalizedOrderId,
          eventType: "PAID",
          weightDeltaGrams: 0,
          actorId: order.userId,
          actorRole: "consumer", // Consumer paid
        });
      }
    } else if (["cancel", "deny", "expire"].includes(args.transactionStatus)) {
      if (order.status === "reserved") {
        await ctx.db.patch(normalizedOrderId, {
          status: "expired",
        });

        // Restore stock
        const item = await ctx.db.get(order.surplusItemId);
        if (item) {
          await ctx.db.patch(item._id, {
            remainingQuantity: item.remainingQuantity + order.quantity,
          });
        }

        // Write CANCELLED ledger event
        await recordLedgerEvent(ctx, {
          surplusItemId: order.surplusItemId,
          orderId: normalizedOrderId,
          eventType: "CANCELLED",
          weightDeltaGrams: 0,
          actorId: order.userId,
          actorRole: "consumer",
        });
      }
    }
  },
});
