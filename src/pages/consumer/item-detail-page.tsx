import {
  ArrowLeft,
  Clock3,
  Info,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";
import { calculateHaversineDistanceMeters } from "@/lib/geo";

const formatIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

const formatKg = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
}).format;

function formatDistance(distanceMeters: number) {
  return distanceMeters < 1_000
    ? `${distanceMeters.toLocaleString("id-ID")} m`
    : `${(distanceMeters / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  
  const item = useQuery(api.discovery.getListing, id ? { id: id as Id<"surplusItems"> } : "skip");
  const reserve = useMutation(api.orders.reserve);
  
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  useEffect(() => {
    if (!item) {
      setDistanceMeters(null);
      return;
    }

    let mounted = true;
    const fallbackLocation = { lat: -6.9932, lng: 110.4203 };
    const updateDistance = (latitude: number, longitude: number) => {
      if (!mounted) return;
      setDistanceMeters(
        calculateHaversineDistanceMeters(
          latitude,
          longitude,
          item.merchant.latitude,
          item.merchant.longitude,
        ),
      );
    };

    updateDistance(fallbackLocation.lat, fallbackLocation.lng);
    navigator.geolocation?.getCurrentPosition(
      (position) => updateDistance(position.coords.latitude, position.coords.longitude),
      () => undefined,
      { timeout: 8_000, maximumAge: 0 },
    );

    return () => {
      mounted = false;
    };
  }, [item]);

  if (item === undefined) {
    return (
      <div className="mx-auto grid max-w-5xl gap-8 py-8 lg:grid-cols-2" aria-label="Memuat detail Rescue Item">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-5 py-3">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Rescue Item tidak ditemukan atau sudah tidak aktif</h1>
        <Button asChild className="mt-5">
          <Link to="/explore">Kembali menjelajah</Link>
        </Button>
      </div>
    );
  }

  const hasStock = item.remainingQuantity > 0;
  const subtotal = item.currentPrice * quantity;

  const handleReserve = async () => {
    if (!hasStock || quantity < 1 || quantity > item.remainingQuantity) return;
    
    try {
      setIsReserving(true);
      // Generate a random idempotency key for this attempt
      const idempotencyKey = crypto.randomUUID();
      
      const orderId = await reserve({
        surplusItemId: item._id,
        quantity,
        idempotencyKey,
        sessionToken: sessionToken || undefined
      });
      
      toast.success("Berhasil direservasi! Segera selesaikan pembayaran.");
      navigate(`/checkout/${orderId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal melakukan reservasi."));
      setIsReserving(false);
    }
  };

  const formattedPickupDate = new Date(item.pickupStartAt).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });
  
  const formattedPickupWindow = `${new Date(item.pickupStartAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(item.pickupEndAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  return (
    <div className="-mt-2 pb-20 sm:pb-0 max-w-5xl mx-auto">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/explore">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="overflow-hidden rounded-2xl bg-muted">
          <img
            src={item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"}
            alt={`Foto ${item.name}`}
            className="aspect-[4/3] size-full object-cover"
          />
        </div>
        <div className="lg:py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={hasStock ? "active" : "sold_out"} />
            <Badge variant="secondary">
              Hemat {item.discountPercentage}%
            </Badge>
          </div>
          <p className="mt-5 text-sm font-medium text-primary">
            {item.merchant.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            {item.name}
          </h1>
          <p className="mt-6 text-2xl font-semibold text-primary">
            {formatIdr(item.currentPrice)}{" "}
            <s className="ml-2 text-base font-normal text-muted-foreground">
              {formatIdr(item.originalPrice)}
            </s>
          </p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {item.description || "Makanan sisa berkualitas dari merchant ini."}
          </p>
          <div className="mt-6 grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-2">
            <p className="flex items-start gap-3 text-sm">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">{formattedPickupDate}</strong>
                <span className="text-muted-foreground">
                  {formattedPickupWindow}
                </span>
              </span>
            </p>
            <p className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">Ambil di merchant</strong>
                <span className="text-muted-foreground">
                  {item.merchant.address}
                  {distanceMeters !== null ? ` · ${formatDistance(distanceMeters)} dari lokasimu` : ""}
                </span>
              </span>
            </p>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium">Preferensi pangan</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.dietaryTags.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              {item.dietaryTags.length === 0 && (
                <span className="text-sm text-muted-foreground">Tidak ada tag.</span>
              )}
            </div>
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Informasi ini membantu penyaringan preferensi, bukan jaminan keamanan alergi.
            </p>
          </div>
          <div className="mt-7 flex items-center justify-between border-y py-4">
            <div>
              <p className="text-sm font-medium">Jumlah paket</p>
              <p className="text-xs text-muted-foreground">
                {item.remainingQuantity} tersisa ·{" "}
                {formatKg(item.weightPerItemGrams / 1_000)} kg per paket
              </p>
            </div>
            {hasStock ? (
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1 || isReserving}
                  aria-label="Kurangi jumlah"
                >
                  <Minus />
                </Button>
                <span className="w-5 text-center font-semibold">
                  {quantity}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    setQuantity((value) =>
                      Math.min(item.remainingQuantity, value + 1),
                    )
                  }
                  disabled={quantity >= item.remainingQuantity || isReserving}
                  aria-label="Tambah jumlah"
                >
                  <Plus />
                </Button>
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                Tidak tersedia
              </span>
            )}
          </div>
          <div className="mt-6 hidden items-center justify-between gap-4 sm:flex">
            <div>
              <p className="text-xs text-muted-foreground">Total Pembayaran</p>
              <p className="text-xl font-semibold">{formatIdr(subtotal)}</p>
            </div>
            <Button
              size="lg"
              onClick={handleReserve}
              disabled={!hasStock || isReserving}
            >
              {isReserving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" /> Reservasi untuk pickup</>
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-[4.5rem] z-20 flex items-center justify-between gap-4 border-t bg-background/95 p-4 backdrop-blur-xl sm:hidden">
        <div>
          <p className="text-xs text-muted-foreground">Total Pembayaran</p>
          <p className="font-semibold">{formatIdr(subtotal)}</p>
        </div>
        <Button
          onClick={handleReserve}
          disabled={!hasStock || isReserving}
        >
          {isReserving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Proses...</>
          ) : (
            "Reservasi"
          )}
        </Button>
      </div>
    </div>
  );
}
