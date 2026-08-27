import { Clock3, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RescueItemPreview } from "@/types/domain";

const formatIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

export function RescueItemCard({
  item,
  horizontal = false,
}: {
  item: RescueItemPreview;
  horizontal?: boolean;
}) {
  const discount = Math.round(
    (1 - item.currentPrice / item.originalPrice) * 100,
  );
  const unavailable = item.status !== "active";

  return (
    <Link
      to={`/item/${item.id}`}
      className={cn(
        "group grid overflow-hidden rounded-2xl border bg-card transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        horizontal ? "grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr]" : "",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          horizontal ? "min-h-40" : "aspect-[4/3]",
        )}
      >
        <img
          src={item.image}
          alt={`Foto ${item.name} dari ${item.merchantName}`}
          width="900"
          height="900"
          loading="lazy"
          className={cn(
            "size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]",
            unavailable && "grayscale",
          )}
        />
        <Badge className="absolute left-3 top-3 border-0 bg-primary text-primary-foreground shadow-none hover:bg-primary">
          Hemat {discount}%
        </Badge>
        {item.rating !== undefined ? (
          <span className="absolute bottom-3 right-3 inline-flex min-h-7 items-center gap-1 rounded-full bg-background px-2 text-xs font-semibold text-foreground shadow-sm">
            <Star
              className="size-3.5 fill-recovered text-recovered"
              aria-hidden="true"
            />
            {item.rating}
          </span>
        ) : null}
        {unavailable ? (
          <span className="absolute inset-0 grid place-items-center bg-foreground/50 text-sm font-semibold text-background">
            Sudah habis
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col p-4">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {item.merchantName}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug tracking-[-0.01em]">
          {item.name}
        </h3>
        <div className="mt-auto pt-4">
          <p>
            <span className="font-semibold text-primary">
              {formatIdr(item.currentPrice)}
            </span>{" "}
            <s className="ml-1 text-xs text-muted-foreground">
              {formatIdr(item.originalPrice)}
            </s>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {item.distanceKm.toLocaleString("id-ID")} km
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {item.pickupWindow}
            </span>
          </div>
          {horizontal ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.remainingQuantity} paket tersisa
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
