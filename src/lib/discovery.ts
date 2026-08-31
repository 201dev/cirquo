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

/** Whole minutes left before the pickup window closes. Never negative. */
export function pickupMinutesLeft(pickupEndAt: number, now: number) {
  return Math.max(0, Math.ceil((pickupEndAt - now) / 60_000));
}

/**
 * Short caption for a closing pickup window, or `null` when there is no rush.
 * Only the final hour earns a badge — a card that shouts on every item teaches
 * people to ignore it.
 */
export function pickupUrgencyLabel(
  pickupEndAt: number,
  now: number,
): string | null {
  const minutes = pickupMinutesLeft(pickupEndAt, now);
  if (minutes === 0) return "Tutup";
  if (minutes < 60) return `${minutes} mnt lagi`;
  return null;
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
    description: "",
    image: item.imageUrl || fallbackImage,
    address: item.merchant.address,
    distanceKm: Number((item.distanceMeters / 1_000).toFixed(1)),
    dietaryTags: item.dietaryTags,
    pickupEndAt: item.pickupEndAt,
  };
}

export type MerchantGroupSource = {
  imageUrl?: string;
  materialType: string;
  originalPrice: number;
  currentPrice: number;
  distanceMeters: number;
  merchant: { _id: string; name: string; address: string };
};

export type MerchantGroup = {
  id: string;
  name: string;
  address: string;
  /** Distance to the merchant, taken from its nearest listed item. */
  distanceMeters: number;
  itemCount: number;
  cheapestPrice: number;
  /** Largest discount on offer, rounded down so the number is never flattering. */
  bestDiscountPercent: number;
  /** Image and material of the first item seen, for the caller to resolve a fallback. */
  imageUrl?: string;
  materialType: string;
};

/**
 * Rolls a flat discovery list up to the merchants behind it, nearest first.
 * Both the home page and a category page need this view, and a merchant's
 * distance is only ever knowable through its items.
 */
export function groupByMerchant(items: MerchantGroupSource[]): MerchantGroup[] {
  const grouped = new Map<string, MerchantGroup>();

  for (const item of items) {
    const discount =
      item.originalPrice > 0
        ? Math.floor(
            ((item.originalPrice - item.currentPrice) / item.originalPrice) * 100,
          )
        : 0;
    const current = grouped.get(item.merchant._id);

    if (current === undefined) {
      grouped.set(item.merchant._id, {
        id: item.merchant._id,
        name: item.merchant.name,
        address: item.merchant.address,
        distanceMeters: item.distanceMeters,
        itemCount: 1,
        cheapestPrice: item.currentPrice,
        bestDiscountPercent: discount,
        imageUrl: item.imageUrl,
        materialType: item.materialType,
      });
      continue;
    }

    current.itemCount += 1;
    current.distanceMeters = Math.min(current.distanceMeters, item.distanceMeters);
    current.cheapestPrice = Math.min(current.cheapestPrice, item.currentPrice);
    current.bestDiscountPercent = Math.max(current.bestDiscountPercent, discount);
    if (current.imageUrl === undefined && item.imageUrl !== undefined) {
      current.imageUrl = item.imageUrl;
      current.materialType = item.materialType;
    }
  }

  return [...grouped.values()].sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
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
