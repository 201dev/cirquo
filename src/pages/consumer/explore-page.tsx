import { Search, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import { toRescueItemPreview } from "@/lib/discovery";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

const formatIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

const categories = [
  { value: "all", label: "Semua" },
  { value: "prepared_food", label: "Makanan siap santap" },
  { value: "bakery", label: "Roti & pastry" },
  { value: "produce", label: "Sayur & buah" },
  { value: "dairy", label: "Susu & olahan" },
  { value: "protein", label: "Protein" },
  { value: "dry_goods", label: "Kering" },
  { value: "mixed", label: "Campur" },
] as const;

type Category = (typeof categories)[number]["value"];

function isCategory(value: string | null): value is Category {
  return categories.some((category) => category.value === value);
}

function readFilter(
  params: URLSearchParams,
  key: string,
  allowed: readonly string[],
  fallback: string,
) {
  const value = params.get(key);
  return value !== null && allowed.includes(value) ? value : fallback;
}

type MapItem = {
  _id: string;
  merchant: { latitude: number; longitude: number };
};

function formatDistance(distanceMeters: number) {
  return distanceMeters < 1_000
    ? `${distanceMeters.toLocaleString("id-ID")} m`
    : `${(distanceMeters / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

function updateMapSource(map: MapboxMap, items: readonly MapItem[]) {
  const source = map.getSource("rescue-items") as GeoJSONSource | undefined;
  source?.setData({
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      properties: { id: item._id },
      geometry: {
        type: "Point",
        coordinates: [item.merchant.longitude, item.merchant.latitude],
      },
    })),
  } satisfies FeatureCollection);
}

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  
  const query = params.get("q") ?? "";
  const requestedCategory = params.get("category");
  const category = isCategory(requestedCategory) ? requestedCategory : "all";
  const maxDistance = readFilter(params, "distance", ["30000", "2000", "3000", "5000"], "30000");
  const maxPrice = readFilter(params, "price", ["all", "15000", "20000", "30000"], "all");
  const pickupWindow = readFilter(params, "pickup", ["all", "before_18", "after_18"], "all");
  const dietary = readFilter(params, "dietary", ["all", "Vegetarian", "Vegan", "Tanpa babi"], "all");

  const setFilter = (key: string, value: string, fallback: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === fallback) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  
  const [selectedItemId, setSelectedItemId] = useState<Id<"surplusItems"> | null>(null);

  useEffect(() => {
    // Get user location or fallback to Semarang
    const fallbackLocation = { lat: -6.9932, lng: 110.4203 }; // Semarang center
    
    let isMounted = true;
    let hasResolved = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const onSuccess = (pos: GeolocationPosition) => {
      if (isMounted) {
        hasResolved = true;
        clearTimeout(timeoutId);
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    };

    const onError = () => {
      if (isMounted) {
        hasResolved = true;
        clearTimeout(timeoutId);
        setLocationDenied(true);
        setLocation(fallbackLocation);
      }
    };

    if (navigator.geolocation) {
      timeoutId = setTimeout(() => {
        if (isMounted && !hasResolved) {
          hasResolved = true;
          setLocationDenied(true);
          setLocation(fallbackLocation);
        }
      }, 8000); // 8s timeout

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      });
    } else {
      setLocationDenied(true);
      setLocation(fallbackLocation);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Convert dietary string to array
  const dietaryTags = dietary === "all" ? undefined : [dietary];

  // Fetch nearby items via Convex
  const nearbyData = useQuery(
    api.discovery.listNearby,
    location
      ? {
          latitude: location.lat,
          longitude: location.lng,
          radiusMeters: Number(maxDistance),
          materialType: category === "all" ? undefined : category,
          dietaryTags,
          maxPrice: maxPrice === "all" ? undefined : Number(maxPrice),
          // We can handle pickup time filtering using server or client, here server takes timestamps but our UI uses simple flags.
          // Due to simplicity, we can just do basic filter on client or adapt for server.
        }
      : "skip"
  );

  const filtered = useMemo(() => {
    if (!nearbyData) return [];
    
    let results = nearbyData.results.filter(item => 
      `${item.name} ${item.merchant.name}`.toLowerCase().includes(query.toLowerCase())
    );

    // Filter pickup window locally since it's "before_18" or "after_18"
    if (pickupWindow !== "all") {
      results = results.filter(item => {
        const date = new Date(item.pickupStartAt);
        const hours = date.getHours();
        return pickupWindow === "before_18" ? hours <= 18 : hours > 18;
      });
    }

    return results;
  }, [nearbyData, query, pickupWindow]);

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedDistanceMeters = filtered.find(
    (item) => item._id === selectedItemId,
  )?.distanceMeters;

  const activeFilterCount = [
    query,
    category !== "all",
    maxDistance !== "30000",
    maxPrice !== "all",
    pickupWindow !== "all",
    dietary !== "all",
  ].filter(Boolean).length;

  useEffect(() => {
    if (!location) return;
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      setMapError(true);
      setMapLoading(false);
      return;
    }

    let disposed = false;
    setMapLoading(true);
    void (async () => {
      try {
        const [{ default: mapboxgl }] = await Promise.all([
          import("mapbox-gl"),
          import("mapbox-gl/dist/mapbox-gl.css"),
        ]);
        if (disposed || !mapContainerRef.current || mapRef.current) return;

        mapboxgl.accessToken = accessToken;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [location.lng, location.lat],
          zoom: 13,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          map.addSource("rescue-items", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: []
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });

          map.addLayer({
            id: "clusters",
            type: "circle",
            source: "rescue-items",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#1BAC4B",
              "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 50, 40]
            }
          });

          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "rescue-items",
            filter: ["has", "point_count"],
            layout: {
              "text-field": "{point_count_abbreviated}",
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12
            },
            paint: { "text-color": "#272727" }
          });

          map.addLayer({
            id: "unclustered-point",
            type: "circle",
            source: "rescue-items",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": "#1BAC4B",
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff"
            }
          });

          map.on("click", "unclustered-point", (e) => {
            if (!e.features || !e.features[0].properties) return;
            const id = e.features[0].properties.id as Id<"surplusItems">;
            setSelectedItemId(id);
          });

          map.on("mouseenter", "unclustered-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "unclustered-point", () => {
            map.getCanvas().style.cursor = "";
          });

          updateMapSource(map, filteredRef.current);
          setMapLoading(false);
        });

        map.on("error", () => {
          if (disposed) return;
          disposed = true;
          map.remove();
          if (mapRef.current === map) mapRef.current = null;
          setMapLoading(false);
          setMapError(true);
        });

        mapRef.current = map;
      } catch {
        if (!disposed) {
          setMapLoading(false);
          setMapError(true);
        }
      }
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [location]);

  // Update map source when filtered data changes
  useEffect(() => {
    filteredRef.current = filtered;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateMapSource(map, filtered);
  }, [filtered]);

  const selectedItemDetails = useQuery(
    api.discovery.getListing,
    selectedItemId ? { id: selectedItemId } : "skip"
  );

  return (
    <>
      <PageHeader
        title="Jelajah Rescue Item"
        description="Cari makanan surplus yang bisa kamu ambil langsung di sekitar Semarang."
      />

      {locationDenied && (
        <div className="mx-4 sm:mx-0 mt-4 rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Lokasi tidak diizinkan. Menampilkan area Semarang.</h3>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-[4.5rem] z-20 -mx-4 border-y bg-background/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border sm:p-4 mt-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Cari Rescue Item</span>
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setFilter("q", event.target.value, "")}
              className="pl-9"
              placeholder="Cari makanan atau merchant"
            />
          </label>
        </div>
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          aria-label="Filter kategori"
        >
          {categories.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={category === item.value ? "default" : "outline"}
              className="shrink-0"
              onClick={() => setFilter("category", item.value, "all")}
              aria-pressed={category === item.value}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FilterSelect
            label="Jarak"
            value={maxDistance}
            onChange={(value) => setFilter("distance", value, "30000")}
            options={[
              ["30000", "Semua jarak"],
              ["2000", "Maks. 2 km"],
              ["3000", "Maks. 3 km"],
              ["5000", "Maks. 5 km"],
            ]}
          />
          <FilterSelect
            label="Harga"
            value={maxPrice}
            onChange={(value) => setFilter("price", value, "all")}
            options={[
              ["all", "Semua harga"],
              ["15000", "Maks. Rp15 ribu"],
              ["20000", "Maks. Rp20 ribu"],
              ["30000", "Maks. Rp30 ribu"],
            ]}
          />
          <FilterSelect
            label="Pickup"
            value={pickupWindow}
            onChange={(value) => setFilter("pickup", value, "all")}
            options={[
              ["all", "Semua waktu"],
              ["before_18", "Mulai ≤18.00"],
              ["after_18", "Mulai >18.00"],
            ]}
          />
          <FilterSelect
            label="Preferensi"
            value={dietary}
            onChange={(value) => setFilter("dietary", value, "all")}
            options={[
              ["all", "Semua preferensi"],
              ["Vegetarian", "Vegetarian"],
              ["Vegan", "Vegan"],
              ["Tanpa babi", "Tanpa babi"],
            ]}
          />
        </div>
        {dietary !== "all" ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Preferensi berasal dari deklarasi merchant, bukan jaminan keamanan
            alergi atau bebas kontaminasi silang.
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_30rem]">
        <section aria-label="Hasil pencarian" className="order-2 lg:order-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {nearbyData === undefined ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Memuat...</span>
              ) : (
                <>
                  <strong className="text-foreground">{filtered.length}</strong>{" "}
                  Rescue Item ditemukan · {activeFilterCount} filter aktif
                </>
              )}
            </p>
          </div>
          
          {nearbyData === undefined ? (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
              aria-label="Memuat Rescue Item"
            >
              {[0, 1, 2].map((index) => (
                <div key={index} className="grid grid-cols-[7.5rem_1fr] gap-4 rounded-2xl border p-3">
                  <Skeleton className="min-h-40" />
                  <div className="space-y-3 py-2">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="mt-8 h-5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filtered.map((item) => (
                <div key={item._id}>
                  <RescueItemCard
                    item={toRescueItemPreview(
                      item,
                      rescueItemImageForMaterialType(item.materialType),
                    )}
                    horizontal
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-muted p-8 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-semibold">Belum ada yang cocok</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Coba ubah filter lokasi atau kriteria lainnya.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setParams((current) => {
                    const next = new URLSearchParams(current);
                    ["q", "category", "distance", "price", "pickup", "dietary"].forEach((key) => next.delete(key));
                    return next;
                  }, { replace: true });
                }}
              >
                Atur ulang filter
              </Button>
            </div>
          )}
        </section>

        <aside
          className="order-1 h-72 overflow-hidden rounded-xl border bg-muted/20 sm:h-96 lg:sticky lg:top-[14rem] lg:order-2 lg:h-[calc(100vh-16rem)] lg:min-h-[300px]"
          aria-label="Peta lokasi merchant"
        >
          {mapError ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="size-12 text-destructive opacity-80" />
              <h3 className="mt-4 font-semibold">Peta tidak tersedia</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                Gunakan daftar Rescue Item untuk melanjutkan pencarian.
              </p>
            </div>
          ) : (
            <div className="relative h-full w-full">
              <div
                ref={mapContainerRef}
                role="application"
                aria-label="Peta Rescue Item di sekitarmu"
                className="h-full w-full"
              />
              {mapLoading ? (
                <div className="pointer-events-none absolute inset-0 p-4" aria-label="Memuat peta">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      <Sheet open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[600px] sm:max-w-md mx-auto rounded-t-2xl sm:rounded-2xl sm:bottom-4 sm:top-auto px-0 pb-0">
          {selectedItemDetails === undefined ? (
            <div className="space-y-5 p-6" aria-label="Memuat detail Rescue Item">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-6 w-2/5" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedItemDetails === null ? (
            <div className="p-6 text-center text-muted-foreground">Item tidak ditemukan atau tidak tersedia.</div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-6 flex-shrink-0">
                <SheetHeader className="text-left pb-4 border-b">
                  <SheetTitle className="text-xl font-bold leading-tight">{selectedItemDetails.name}</SheetTitle>
                  <SheetDescription className="text-sm font-medium text-primary">
                    Dari {selectedItemDetails.merchant.name}
                  </SheetDescription>
                </SheetHeader>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <img 
                  src={selectedItemDetails.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"} 
                  alt={selectedItemDetails.name}
                  className="w-full h-48 object-cover rounded-xl mb-6" 
                />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground line-through">{formatIdr(selectedItemDetails.originalPrice)}</p>
                      <p className="text-2xl font-bold text-primary">{formatIdr(selectedItemDetails.currentPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Tersedia</p>
                      <p className="font-semibold">{selectedItemDetails.remainingQuantity} porsi</p>
                    </div>
                  </div>
                  
                  {selectedItemDetails.description && (
                    <p className="text-sm text-muted-foreground">{selectedItemDetails.description}</p>
                  )}

                  <div className="bg-muted/50 p-4 rounded-xl space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipe</span>
                      <span className="font-medium capitalize">{selectedItemDetails.materialType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pickup</span>
                      <span className="font-medium">
                        {new Date(selectedItemDetails.pickupStartAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedItemDetails.pickupEndAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lokasi</span>
                      <span className="font-medium text-right max-w-[200px] truncate">{selectedItemDetails.merchant.address}</span>
                    </div>
                    {selectedDistanceMeters !== undefined ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jarak</span>
                        <span className="font-medium">{formatDistance(selectedDistanceMeters)}</span>
                      </div>
                    ) : null}
                  </div>
                  
                  {selectedItemDetails.dietaryTags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedItemDetails.dietaryTags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedItemId ? (
                <div className="px-6 py-4 border-t bg-background flex-shrink-0">
                  <Button asChild className="w-full h-12 text-base font-semibold">
                    <Link to={`/item/${selectedItemId}`}>Pilih jumlah dan reservasi</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="block text-[0.7rem] font-medium text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
