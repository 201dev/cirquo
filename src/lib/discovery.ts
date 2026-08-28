import type { RescueItemPreview } from "../types/domain";

type DiscoveryItem = {
  status: string;
  processingOnly: boolean;
  remainingQuantity: number;
  pickupEndAt: number;
};

type DiscoveryMerchant = {
  verificationStatus: string;
  latitude?: number;
  longitude?: number;
};

type DiscoveryMerchantWithLocation = DiscoveryMerchant & {
  latitude: number;
  longitude: number;
};

type DiscoveryRankedItem = {
  distanceMeters: number;
  pickupEndAt: number;
};

export type DiscoveryPreviewSource = {
  _id: string;
  name: string;
  imageUrl?: string;
  materialType: string;
  dietaryTags: string[];
  originalPrice: number;
  currentPrice: number;
  remainingQuantity: number;
  weightPerItemGrams: number;
  pickupStartAt: number;
  pickupEndAt: number;
  distanceMeters: number;
  merchant: {
    name: string;
    address: string;
  };
};

const pickupTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

const pickupDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

function previewCategory(materialType: string): RescueItemPreview["category"] {
  if (materialType === "bakery") return "bakery";
  if (materialType === "produce") return "produce";
  return "meal";
}

export function toRescueItemPreview(
  item: DiscoveryPreviewSource,
  fallbackImage: string,
): RescueItemPreview {
  return {
    id: item._id,
    name: item.name,
    merchantName: item.merchant.name,
    currentPrice: item.currentPrice,
    originalPrice: item.originalPrice,
    remainingQuantity: item.remainingQuantity,
    weightPerItemGrams: item.weightPerItemGrams,
    pickupWindow: `${pickupTimeFormatter.format(item.pickupStartAt)}-${pickupTimeFormatter.format(item.pickupEndAt)} WIB`,
    status: "active",
    category: previewCategory(item.materialType),
    description: "",
    image: item.imageUrl || fallbackImage,
    address: item.merchant.address,
    distanceKm: Number((item.distanceMeters / 1_000).toFixed(1)),
    dietaryTags: item.dietaryTags,
    pickupDate: pickupDateFormatter.format(item.pickupStartAt),
  };
}

export function isPublicDiscoveryItem(
  item: DiscoveryItem,
  merchant: DiscoveryMerchant | null | undefined,
  now: number,
): merchant is DiscoveryMerchantWithLocation {
  return (
    item.status === "active" &&
    !item.processingOnly &&
    item.remainingQuantity > 0 &&
    item.pickupEndAt > now &&
    merchant?.verificationStatus === "verified" &&
    merchant.latitude !== undefined &&
    merchant.longitude !== undefined
  );
}

export function sortByDistanceThenUrgency<T extends DiscoveryRankedItem>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) => a.distanceMeters - b.distanceMeters || a.pickupEndAt - b.pickupEndAt,
  );
}
