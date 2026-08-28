import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

export type MaterialType = Doc<"surplusItems">["materialType"];

const TEMBALANG_CENTER = {
  latitude: -7.052,
  longitude: 110.44,
} as const;

export function useNearbyRescueItems(options?: {
  materialType?: MaterialType;
  radiusMeters?: number;
}) {
  return useQuery(api.discovery.listNearby, {
    ...TEMBALANG_CENTER,
    radiusMeters: options?.radiusMeters ?? 30_000,
    materialType: options?.materialType,
  });
}
