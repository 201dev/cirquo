import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useCurrentLocation } from "./use-current-location";

export type MaterialType = Doc<"surplusItems">["materialType"];

export function useNearbyRescueItems(options?: {
  materialType?: MaterialType;
  radiusMeters?: number;
}) {
  // The radius follows wherever the reader actually is. It used to be centred on
  // a hardcoded Tembalang, which quietly made "di dekatmu" false for everyone
  // outside it. `use-current-location` falls back to Tembalang on its own when
  // the device says nothing, so there is no null case to handle here.
  const { latitude, longitude } = useCurrentLocation();

  return useQuery(api.discovery.listNearby, {
    latitude,
    longitude,
    radiusMeters: options?.radiusMeters ?? 30_000,
    materialType: options?.materialType,
  });
}
