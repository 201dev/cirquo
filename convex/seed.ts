import { internalMutation } from "./_generated/server";
import { recordLedgerEvent } from "./lib/ledger";

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    // 0. Clean up existing seed data to prevent duplicates
    const emailsToClean = ["budi.bakery@example.com", "andi@example.com"];
    
    for (const email of emailsToClean) {
      const existingUsers = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();
      
      for (const user of existingUsers) {
        // Find and delete their merchant profile (if any)
        const merchant = await ctx.db
          .query("merchants")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .unique();
        
        if (merchant) {
          // Find and delete their surplus items
          const items = await ctx.db
            .query("surplusItems")
            .withIndex("by_merchant", (q) => q.eq("merchantId", merchant._id))
            .collect();
          
          for (const item of items) {
            await ctx.db.delete(item._id);
          }
          await ctx.db.delete(merchant._id);
        }
        await ctx.db.delete(user._id);
      }
    }

    const merchantUserId = await ctx.db.insert("users", {
      name: "Budi Bakery & Cafe",
      email: "budi.bakery@example.com",
      passwordHash: "scrypt$16384$8$1$Q77lBMDJnw1opX5Cr0QQzg==$cvUbulbCsgt3dga6JdrcsTDD/caqP3xH0ZJqQqV3GlU=", // Hashed version of "budi.bakery"
      role: "merchant",
      phone: "081234567890",
      status: "active",
      createdAt: Date.now(),
    });

    const merchantId = await ctx.db.insert("merchants", {
      ownerId: merchantUserId,
      name: "Budi Bakery & Cafe",
      businessType: "bakery",
      address: "Jl. Pemuda No. 118, Sekayu, Semarang Tengah",
      city: "Semarang",
      latitude: -6.9825,
      longitude: 110.4140,
      phone: "081234567890",
      verificationStatus: "verified",
      createdAt: Date.now(),
    });

    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;
    const twoHoursFromNow = now + 2 * 60 * 60 * 1000;
    const tomorrow = now + 24 * 60 * 60 * 1000;

    const itemsToCreate = [
      {
        name: "Paket Roti Sisa Hari Ini",
        description: "Berisi 3 potong roti manis dan 2 croissant sisa display hari ini.",
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
        originalPrice: 50000,
        floorPrice: 15000,
        currentPrice: 20000,
        initialQuantity: 5,
        weightPerItemGrams: 500,
        pickupStartAt: now,
        pickupEndAt: twoHoursFromNow,
        materialType: "bakery" as const,
        dietaryTags: ["Vegetarian", "Tanpa babi"],
      },
      {
        name: "Nasi Campur Spesial",
        description: "Nasi campur porsi lengkap. Aman dikonsumsi malam ini.",
        imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=800",
        originalPrice: 35000,
        floorPrice: 10000,
        currentPrice: 15000,
        initialQuantity: 3,
        weightPerItemGrams: 400,
        pickupStartAt: oneHourFromNow,
        pickupEndAt: tomorrow,
        materialType: "prepared_food" as const,
        dietaryTags: ["Tanpa babi"],
      },
      {
        name: "Sayur & Buah Segar (Sisa Sortir)",
        description: "Sayuran hidroponik dan pisang yang sedikit bernoda tapi sangat layak konsumsi.",
        imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800",
        originalPrice: 40000,
        floorPrice: 10000,
        currentPrice: 12000,
        initialQuantity: 10,
        weightPerItemGrams: 1500,
        pickupStartAt: now,
        pickupEndAt: oneHourFromNow,
        materialType: "produce" as const,
        dietaryTags: ["Vegan", "Vegetarian", "Tanpa babi"],
      }
    ];

    for (const item of itemsToCreate) {
      const surplusItemId = await ctx.db.insert("surplusItems", {
        merchantId,
        ...item,
        remainingQuantity: item.initialQuantity,
        processingOnly: false,
        status: "active",
        publishedAt: now,
        createdAt: now,
      });

      await recordLedgerEvent(ctx, {
        surplusItemId,
        eventType: "LISTED",
        weightDeltaGrams: item.initialQuantity * item.weightPerItemGrams,
        actorId: merchantUserId,
        actorRole: "merchant",
        metadata: { seedData: true }
      });
    }

    // 4. Create a dummy Consumer User
    await ctx.db.insert("users", {
      name: "Andi Consumer",
      email: "andi@example.com",
      passwordHash: "scrypt$16384$8$1$SOolvCCJ9vkLHrNP4vefyA==$Uxr+KU1kYqmW7kg/Zio3NWswjuMWyaaZR45It7sYQWw=", // Hashed version of "andi123"
      role: "consumer",
      phone: "081234567891",
      status: "active",
      createdAt: now,
    });

    return "Seed data created successfully! 1 Merchant, 3 active Rescue Items, and 1 Consumer added.";
  },
});
