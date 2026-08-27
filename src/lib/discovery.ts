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
