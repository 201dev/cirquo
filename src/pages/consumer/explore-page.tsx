import { Search, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RescueItemPreview } from "@/types/domain";
import { formatIdr } from "@/constants/mock-data";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FeatureCollection } from "geojson";

const categories = [
  { value: "all", label: "Semua" },
  { value: "prepared_food", label: "Makanan siap santap" },
  { value: "bakery", label: "Roti & pastry" },
  { value: "produce", label: "Sayur & buah" },
  { value: "dairy", label: "Susu & olahan" },
  { value: "protein", label: "Protein" },
  { value: "dry_goods", label: "Kering" },
  { value: "mixed", label: "Campur" },
];

export default function ExplorePage() {
  const [params] = useSearchParams();
  
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<string>(() => {
    const requestedCategory = params.get("category");
    return categories.some((item) => item.value === requestedCategory)
      ? (requestedCategory ?? "all")
      : "all";
  });
  
  const [maxDistance, setMaxDistance] = useState("30000"); // max 30km
  const [maxPrice, setMaxPrice] = useState("all");
  const [pickupWindow, setPickupWindow] = useState("all");
  const [dietary, setDietary] = useState("all");

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  const [selectedItemId, setSelectedItemId] = useState<Id<"surplusItems"> | null>(null);

  useEffect(() => {
    // Get user location or fallback to Semarang
    const fallbackLocation = { lat: -6.9932, lng: 110.4203 }; // Semarang center
    
    let isMounted = true;
    let hasResolved = false;
    let timeoutId: number;

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

  const reserveMutation = useMutation(api.orders.reserve);
  const [isReserving, setIsReserving] = useState(false);

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
          materialType: category === "all" ? undefined : (category as any),
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
    if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
      setMapError(true);
      return;
    }

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
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
            "circle-color": "#16a34a",
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
          paint: { "text-color": "#ffffff" }
        });

        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "rescue-items",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#16a34a",
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
      });

      mapRef.current = map;
    }

    return () => {
      // Mapbox cleanup handled when component unmounts entirely
    };
  }, [location]);

  // Update map source when filtered data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !filtered) return;

    const geojsonData: FeatureCollection = {
      type: "FeatureCollection",
      features: filtered.map(item => ({
        type: "Feature",
        properties: { id: item._id },
        geometry: {
          type: "Point",
          coordinates: [item.merchant.longitude, item.merchant.latitude]
        }
      }))
    };

    const source = map.getSource("rescue-items") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojsonData);
    }
  }, [filtered]);

  const selectedItemDetails = useQuery(
    api.discovery.getListing,
    selectedItemId ? { id: selectedItemId } : "skip"
  );

  const handleReserve = async () => {
    if (!selectedItemId) return;
    try {
      setIsReserving(true);
      await reserveMutation({
        surplusItemId: selectedItemId,
        quantity: 1, // Defaulting to 1 for MVP
        idempotencyKey: crypto.randomUUID(),
        // sessionToken should be handled by Convex Auth or passed securely if custom
      });
      toast.success("Berhasil memesan! Silakan lanjutkan pembayaran.");
      setSelectedItemId(null);
      // Handoff to M3-05 (Checkout page would be navigated here)
      // navigate(`/checkout/${selectedItemId}`); 
    } catch (error: any) {
      toast.error(error.message || "Gagal melakukan reservasi");
    } finally {
      setIsReserving(false);
    }
  };

  const mapToPreview = (item: any): RescueItemPreview => {
    const start = new Date(item.pickupStartAt);
    const end = new Date(item.pickupEndAt);
    const formatTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    return {
      id: item._id,
      name: item.name,
      merchantName: item.merchant.name,
      currentPrice: item.currentPrice,
      originalPrice: item.originalPrice,
      remainingQuantity: item.remainingQuantity,
      weightPerItemGrams: item.weightPerItemGrams,
      pickupWindow: `${formatTime(start)} - ${formatTime(end)}`,
      status: "active",
      category: item.materialType === "bakery" ? "bakery" : (item.materialType === "produce" ? "produce" : "meal"),
      description: item.description || "",
      image: item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
      address: item.merchant.address,
      distanceKm: Number((item.distanceMeters / 1000).toFixed(1)),
      rating: 4.8, // Mocked rating since it's not in schema
      dietaryTags: item.dietaryTags,
      pickupDate: start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    };
  };

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
              onChange={(event) => setQuery(event.target.value)}
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
              onClick={() => setCategory(item.value)}
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
            onChange={setMaxDistance}
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
            onChange={setMaxPrice}
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
            onChange={setPickupWindow}
            options={[
              ["all", "Semua waktu"],
              ["before_18", "Mulai ≤18.00"],
              ["after_18", "Mulai >18.00"],
            ]}
          />
          <FilterSelect
            label="Preferensi"
            value={dietary}
            onChange={setDietary}
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
          
          {nearbyData !== undefined && filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filtered.map((item) => (
                <div key={item._id} onClick={() => setSelectedItemId(item._id)} className="cursor-pointer">
                  <RescueItemCard item={mapToPreview(item)} horizontal />
                </div>
              ))}
            </div>
          ) : nearbyData !== undefined ? (
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
                  setQuery("");
                  setCategory("all");
                  setMaxDistance("30000");
                  setMaxPrice("all");
                  setPickupWindow("all");
                  setDietary("all");
                }}
              >
                Atur ulang filter
              </Button>
            </div>
          ) : null}
        </section>

        <aside
          className="sticky top-[14rem] h-[calc(100vh-16rem)] min-h-[300px] overflow-hidden rounded-xl border order-1 lg:order-2 bg-muted/20"
          aria-label="Peta lokasi merchant"
        >
          {mapError ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="size-12 text-destructive opacity-80" />
              <h3 className="mt-4 font-semibold">Peta tidak tersedia</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                Mapbox access token belum dikonfigurasi. Tambahkan VITE_MAPBOX_ACCESS_TOKEN ke .env.local Anda.
              </p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="h-full w-full relative" />
          )}
        </aside>
      </div>

      <Sheet open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[600px] sm:max-w-md mx-auto rounded-t-2xl sm:rounded-2xl sm:bottom-4 sm:top-auto px-0 pb-0">
          {selectedItemDetails === undefined ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              
              <div className="px-6 py-4 border-t bg-background flex-shrink-0">
                <Button 
                  className="w-full h-12 text-base font-semibold" 
                  onClick={handleReserve}
                  disabled={isReserving}
                >
                  {isReserving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Pesan sekarang
                </Button>
              </div>
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
