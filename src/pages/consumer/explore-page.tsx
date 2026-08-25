import { ListFilter, Map, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { RescueItemCard } from "@/components/common/rescue-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rescueItems } from "@/constants/mock-data";

const categories = [
  { value: "all", label: "Semua" },
  { value: "bakery", label: "Roti & pastry" },
  { value: "meal", label: "Makanan siap santap" },
  { value: "produce", label: "Sayur & buah" },
];

type SortMode = "ranked" | "distance" | "price" | "pickup";

const sortLabels: Record<SortMode, string> = {
  ranked: "Rekomendasi",
  distance: "Jarak terdekat",
  price: "Harga termurah",
  pickup: "Pickup terawal",
};

export default function ExplorePage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(() => {
    const requestedCategory = params.get("category");
    return categories.some((item) => item.value === requestedCategory)
      ? (requestedCategory ?? "all")
      : "all";
  });
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("ranked");
  const [maxDistance, setMaxDistance] = useState("all");
  const [maxPrice, setMaxPrice] = useState("all");
  const [pickupWindow, setPickupWindow] = useState("all");
  const [dietary, setDietary] = useState("all");
  const filtered = useMemo(() => {
    const results = rescueItems.filter(
      (item) =>
        `${item.name} ${item.merchantName}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (category === "all" || item.category === category) &&
        (!availableOnly || item.status === "active") &&
        (maxDistance === "all" || item.distanceKm <= Number(maxDistance)) &&
        (maxPrice === "all" || item.currentPrice <= Number(maxPrice)) &&
        (dietary === "all" ||
          item.dietaryTags.some(
            (tag) => tag.toLowerCase() === dietary.toLowerCase(),
          )) &&
        matchesPickupWindow(item.pickupWindow, pickupWindow),
    );

    return [...results].sort((first, second) => {
      if (sortMode === "distance") return first.distanceKm - second.distanceKm;
      if (sortMode === "price") return first.currentPrice - second.currentPrice;
      if (sortMode === "pickup")
        return (
          pickupStart(first.pickupWindow) - pickupStart(second.pickupWindow)
        );
      return 0;
    });
  }, [
    availableOnly,
    category,
    dietary,
    maxDistance,
    maxPrice,
    pickupWindow,
    query,
    sortMode,
  ]);
  const activeFilterCount = [
    query,
    category !== "all",
    availableOnly,
    maxDistance !== "all",
    maxPrice !== "all",
    pickupWindow !== "all",
    dietary !== "all",
  ].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Jelajah Rescue Item"
        description="Cari makanan surplus yang bisa kamu ambil langsung di sekitar Semarang."
      />
      <div className="sticky top-[4.5rem] z-20 -mx-4 border-y bg-background/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border sm:p-4">
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
          <Button
            variant={availableOnly ? "secondary" : "outline"}
            onClick={() => setAvailableOnly((value) => !value)}
            aria-pressed={availableOnly}
            aria-label="Tampilkan hanya Rescue Item yang tersedia"
          >
            <ListFilter />{" "}
            <span className="hidden sm:inline">Tersedia saja</span>
          </Button>
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
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <FilterSelect
            label="Urutkan"
            value={sortMode}
            onChange={(value) => setSortMode(value as SortMode)}
            options={[
              ["ranked", "Rekomendasi"],
              ["distance", "Terdekat"],
              ["price", "Termurah"],
              ["pickup", "Pickup terawal"],
            ]}
          />
          <FilterSelect
            label="Jarak"
            value={maxDistance}
            onChange={setMaxDistance}
            options={[
              ["all", "Semua jarak"],
              ["2", "Maks. 2 km"],
              ["3", "Maks. 3 km"],
              ["5", "Maks. 5 km"],
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
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Hasil pencarian">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{filtered.length}</strong>{" "}
              Rescue Item ditemukan · {activeFilterCount} filter aktif
            </p>
            <span className="text-xs text-muted-foreground">
              {sortLabels[sortMode]}
            </span>
          </div>
          {filtered.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((item) => (
                <RescueItemCard key={item.id} item={item} horizontal />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-muted p-8 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-semibold">Belum ada yang cocok</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Coba kategori lain atau tampilkan Rescue Item yang sudah habis.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setAvailableOnly(false);
                  setMaxDistance("all");
                  setMaxPrice("all");
                  setPickupWindow("all");
                  setDietary("all");
                  setSortMode("ranked");
                }}
              >
                Atur ulang filter
              </Button>
            </div>
          )}
        </section>
        <aside
          className="sticky top-48 hidden overflow-hidden rounded-xl bg-secondary lg:block"
          aria-label="Pratinjau area peta"
        >
          <div className="relative h-[31rem] p-6">
            <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_25%_25%,var(--primary)_0_3px,transparent_4px),radial-gradient(circle_at_68%_35%,var(--primary)_0_4px,transparent_5px),radial-gradient(circle_at_48%_72%,var(--primary)_0_3px,transparent_4px)]" />
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Map />
              </span>
              <h2 className="mt-4 font-semibold">Area Tembalang</h2>
              <p className="mt-1 max-w-56 text-sm text-muted-foreground">
                Pratinjau peta. Lokasi realtime akan aktif setelah integrasi
                Mapbox.
              </p>
              <span className="mt-5 rounded-md bg-background px-3 py-2 text-xs font-medium shadow-sm">
                3 merchant dalam 3,1 km
              </span>
            </div>
          </div>
        </aside>
      </div>
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

function pickupStart(window: string) {
  const [hours = 0, minutes = 0] = window
    .split(/[.\-–]/)[0]
    .split(".")
    .map(Number);
  return hours * 60 + minutes;
}

function matchesPickupWindow(window: string, filter: string) {
  if (filter === "all") return true;
  const start = pickupStart(window);
  return filter === "before_18" ? start <= 18 * 60 : start > 18 * 60;
}
