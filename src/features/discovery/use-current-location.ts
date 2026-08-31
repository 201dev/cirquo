import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * One resolved location for the whole consumer app.
 *
 * Before this file there were four independent `getCurrentPosition` calls
 * (`explore-page`, `item-detail-page`, `onboarding-page`, `profile-page`) plus a
 * hardcoded `TEMBALANG_CENTER`, so the header could say one thing while the
 * distances beside it were measured from somewhere else. The store is module
 * scoped on purpose: every component reads the same answer and the browser
 * prompts once per load, not once per mounted component.
 */
export type LocationStatus = "resolving" | "ready" | "denied" | "unsupported";

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  /** Human label for the header chip, e.g. "Pedurungan, Semarang". */
  label: string;
  /** True while the coordinates are the pilot-area guess, not the device. */
  isFallback: boolean;
  status: LocationStatus;
}

/**
 * Tembalang stays as the fallback because the pilot merchants are there, so an
 * unlocated visitor still sees a populated list rather than an empty radius.
 * `isFallback` exists so the UI can say so instead of implying it is the user.
 */
const FALLBACK = {
  latitude: -7.052,
  longitude: 110.44,
  label: "Tembalang, Semarang",
} as const;

const CACHE_KEY = "cirquo.location.v1";
/** A day-old label is still a fine first paint; the coordinates refresh anyway. */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function readCache(): CurrentLocation | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { latitude, longitude, label, savedAt } = parsed as Record<string, unknown>;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof label !== "string" ||
      typeof savedAt !== "number" ||
      Date.now() - savedAt > CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    // Still "resolving": the cache avoids a flash of the fallback label, it does
    // not stand in for a fresh fix.
    return { latitude, longitude, label, isFallback: false, status: "resolving" };
  } catch {
    return null;
  }
}

function writeCache(location: CurrentLocation) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        label: location.label,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Private mode or a full quota. A missing cache only costs one label flash.
  }
}

let state: CurrentLocation =
  readCache() ?? { ...FALLBACK, isFallback: true, status: "resolving" };

const listeners = new Set<() => void>();

function setState(next: CurrentLocation) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Mapbox reverse geocoding, the same token the map already uses. Returns null on
 * any failure: a missing label is not a reason to throw away real coordinates,
 * so the caller keeps the previous label and the distances stay correct.
 */
async function fetchLabel(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<string | null> {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!token) return null;

  const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  // `locality` is the kelurahan/kecamatan level, `place` the city. Asking for
  // both in one call is what produces "Pedurungan, Semarang".
  url.searchParams.set("types", "neighborhood,locality,place");
  url.searchParams.set("language", "id");
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", token);

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const feature = (body as { features?: { properties?: unknown }[] }).features?.[0];
    const properties = feature?.properties as
      | {
          name?: string;
          context?: Record<string, { name?: string } | undefined>;
        }
      | undefined;
    if (properties === undefined) return null;

    const area = properties.name;
    const city = properties.context?.place?.name;
    const parts = [area, city].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );
    // Mapbox repeats the name in `context` when the match *is* the city.
    const unique = [...new Set(parts)];
    return unique.length > 0 ? unique.join(", ") : null;
  } catch {
    return null;
  }
}

let inFlight: AbortController | null = null;

/**
 * Asks the device once and reverse geocodes the answer. Safe to call again: a
 * second call cancels the first, which is what the header chip does when it is
 * pressed to re-detect.
 */
function resolve() {
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;

  if (typeof navigator === "undefined" || navigator.geolocation === undefined) {
    setState({ ...FALLBACK, isFallback: true, status: "unsupported" });
    return;
  }

  setState({ ...state, status: "resolving" });

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (controller.signal.aborted) return;
      const { latitude, longitude } = coords;
      // Coordinates land first so distances stop being wrong before the label
      // arrives; the label is cosmetic and one network round trip slower.
      setState({
        latitude,
        longitude,
        label: state.isFallback ? "Lokasi kamu" : state.label,
        isFallback: false,
        status: "ready",
      });
      void fetchLabel(latitude, longitude, controller.signal).then((label) => {
        if (controller.signal.aborted) return;
        const next: CurrentLocation = {
          latitude,
          longitude,
          label: label ?? "Lokasi kamu",
          isFallback: false,
          status: "ready",
        };
        setState(next);
        writeCache(next);
      });
    },
    (error) => {
      if (controller.signal.aborted) return;
      // Denied, unavailable, or timed out all mean the same thing to the UI: the
      // numbers below are pilot-area numbers and must not be labelled as yours.
      setState({
        ...FALLBACK,
        isFallback: true,
        status:
          error.code === error.PERMISSION_DENIED ? "denied" : "unsupported",
      });
    },
    { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
  );
}

let started = false;

/**
 * Reads the shared location. The first component to mount triggers the browser
 * prompt; later ones just subscribe.
 */
export function useCurrentLocation() {
  const location = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

  useEffect(() => {
    if (started) return;
    started = true;
    resolve();
  }, []);

  const refresh = useCallback(() => {
    started = true;
    resolve();
  }, []);

  return { ...location, refresh };
}
