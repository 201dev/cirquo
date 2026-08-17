import { Clock3, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatIdr } from "@/constants/mock-data";
import { cn } from "@/lib/utils";
import type { RescueItemPreview } from "@/types/domain";

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
        "group grid overflow-hidden rounded-xl bg-card shadow-[0_10px_30px_-24px_color-mix(in_oklab,var(--foreground)_55%,transparent)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-22px_color-mix(in_oklab,var(--foreground)_50%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            "size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
            unavailable && "grayscale",
          )}
        />
        <Badge className="absolute left-3 top-3 border-0 bg-foreground/90 text-background shadow-none hover:bg-foreground">
          Hemat {discount}%
        </Badge>
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
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-current text-recovered" />
            {item.rating}
          </span>
          <span aria-hidden="true">•</span>
          <span>{item.distanceKm.toLocaleString("id-ID")} km</span>
        </div>
        <div className="mt-auto pt-4">
          <p>
            <span className="font-semibold text-primary">
              {formatIdr(item.currentPrice)}
            </span>{" "}
            <s className="ml-1 text-xs text-muted-foreground">
              {formatIdr(item.originalPrice)}
            </s>
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
            Pickup {item.pickupWindow}
          </p>
          {horizontal ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {item.remainingQuantity} paket tersisa
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
