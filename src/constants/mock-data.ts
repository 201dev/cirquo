import bakeryImage from "@/assets/rescue-bakery.webp";
import mealImage from "@/assets/rescue-meal.webp";
import produceImage from "@/assets/rescue-produce.webp";
import type {
  LedgerEventPreview,
  OrderPreview,
  RecoveryBatchPreview,
  RescueItemPreview,
} from "@/types/domain";

export const rescueItems: RescueItemPreview[] = [
  {
    id: "rescue-1",
    name: "Roti artisan sore hari",
    merchantName: "Roti Tembalang",
    currentPrice: 18000,
    originalPrice: 36000,
    remainingQuantity: 4,
    weightPerItemGrams: 450,
    pickupWindow: "17.00-19.00 WIB",
    status: "active",
    category: "bakery",
    description:
      "Pilihan croissant, sourdough, dan roti manis yang dibuat pagi ini. Isi paket menyesuaikan stok yang tersisa.",
    image: bakeryImage,
    address: "Jl. Tirto Agung No. 21, Tembalang",
    distanceKm: 1.2,
    dietaryTags: ["Vegetarian"],
    pickupDate: "Hari ini",
  },
  {
    id: "rescue-2",
    name: "Paket nasi dan lauk",
    merchantName: "Dapur Banyumanik",
    currentPrice: 14000,
    originalPrice: 28000,
    remainingQuantity: 7,
    weightPerItemGrams: 500,
    pickupWindow: "18.30-20.00 WIB",
    status: "active",
    category: "meal",
    description:
      "Satu porsi nasi hangat dengan dua lauk rumahan. Menu dipilih merchant sesuai surplus yang tersedia.",
    image: mealImage,
    address: "Jl. Durian Raya No. 8, Banyumanik",
    distanceKm: 2.4,
    dietaryTags: ["Tanpa babi"],
    pickupDate: "Hari ini",
  },
  {
    id: "rescue-3",
    name: "Kotak sayur segar pilihan",
    merchantName: "Kebun Kota Semarang",
    currentPrice: 12000,
    originalPrice: 26000,
    remainingQuantity: 3,
    weightPerItemGrams: 900,
    pickupWindow: "16.00-18.00 WIB",
    status: "active",
    category: "produce",
    description:
      "Campuran sayur dan buah dengan bentuk kurang sempurna, tetap segar dan layak konsumsi.",
    image: produceImage,
    address: "Pasar Srondol, Banyumanik",
    distanceKm: 3.1,
    dietaryTags: ["Vegan", "Tanpa olahan"],
    pickupDate: "Hari ini",
  },
  {
    id: "rescue-4",
    name: "Paket pastry penutup hari",
    merchantName: "Roti Tembalang",
    currentPrice: 20000,
    originalPrice: 42000,
    remainingQuantity: 0,
    weightPerItemGrams: 520,
    pickupWindow: "17.30-19.30 WIB",
    status: "sold_out",
    category: "bakery",
    description:
      "Pastry dan roti manis produksi hari ini dalam satu paket hemat.",
    image: bakeryImage,
    address: "Jl. Tirto Agung No. 21, Tembalang",
    distanceKm: 1.2,
    dietaryTags: ["Vegetarian"],
    pickupDate: "Kemarin",
  },
];

export const orders: OrderPreview[] = [
  {
    id: "order-1",
    itemName: "Roti artisan sore hari",
    merchantName: "Roti Tembalang",
    totalPrice: 18000,
    pickupCode: "CQ-4821",
    status: "paid",
    quantity: 1,
    pickupWindow: "Hari ini, 17.00-19.00 WIB",
    image: bakeryImage,
    orderedAt: "17 Agu 2026, 14.12 WIB",
  },
  {
    id: "order-2",
    itemName: "Paket nasi dan lauk",
    merchantName: "Dapur Banyumanik",
    totalPrice: 28000,
    pickupCode: "CQ-1945",
    status: "picked_up",
    quantity: 2,
    pickupWindow: "15 Agu 2026, 18.30-20.00 WIB",
    image: mealImage,
    orderedAt: "15 Agu 2026, 11.07 WIB",
  },
];

export const recoveryBatches: RecoveryBatchPreview[] = [
  {
    id: "batch-1",
    merchantName: "Dapur Banyumanik",
    itemName: "Sisa olahan sayur",
    offeredWeightGrams: 8200,
    status: "offered",
    distanceKm: 3.8,
    requestedAt: "Hari ini, 19.05 WIB",
    pickupWindow: "20.00-21.00 WIB",
  },
  {
    id: "batch-2",
    merchantName: "Kebun Kota Semarang",
    itemName: "Sayur tidak terserap pasar",
    offeredWeightGrams: 12400,
    status: "processed",
    distanceKm: 5.2,
    requestedAt: "15 Agu 2026, 18.40 WIB",
    pickupWindow: "15 Agu, 19.30-21.00 WIB",
    outcome: "compost",
  },
];

export const ledgerEvents: LedgerEventPreview[] = [
  {
    id: "event-1",
    itemName: "Roti artisan sore hari",
    eventType: "LISTED",
    actor: "Roti Tembalang",
    actorRole: "merchant",
    weightDeltaGrams: 1800,
    timestamp: "Hari ini, 13.42 WIB",
  },
  {
    id: "event-2",
    itemName: "Roti artisan sore hari",
    eventType: "RESERVED",
    actor: "Alya Putri",
    actorRole: "consumer",
    weightDeltaGrams: 0,
    timestamp: "Hari ini, 14.12 WIB",
  },
  {
    id: "event-3",
    itemName: "Kotak sayur segar pilihan",
    eventType: "ROUTED",
    actor: "Sistem Cirquo",
    weightDeltaGrams: 0,
    timestamp: "Kemarin, 18.01 WIB",
  },
  {
    id: "event-4",
    itemName: "Sayur tidak terserap pasar",
    eventType: "PROCESSED",
    actor: "KomposKita",
    actorRole: "processor",
    weightDeltaGrams: -12400,
    timestamp: "15 Agu 2026, 21.18 WIB",
    recoveredWeightGrams: 11500,
    residualWeightGrams: 900,
  },
];

export const formatIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatKg = (grams: number) =>
  `${(grams / 1000).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;

export const demoImpact = {
  rescuedGrams: 18700,
  recoveredGrams: 32600,
  residualGrams: 3600,
  inProgressGrams: 4900,
};
