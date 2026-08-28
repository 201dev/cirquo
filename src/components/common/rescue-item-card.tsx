import { Clock3, MapPin, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { pickupUrgencyLabel } from "@/lib/discovery";
import { formatIdr, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RescueItemPreview } from "@/types/domain";

/**
 * One card carries eight facts: photo, discount, how long the window stays
 * open, merchant, item, distance, portion weight, price pair, stock left, and
 * the first dietary tag. That density is the point — a card with three facts
 * and a lot of padding reads as a placeholder.
 *
 * Nothing here is invented. There is no rating system in Cirquo, so no card
 * shows a rating.
 */
export function RescueItemCard({
  item,
  horizontal = false,
}: {
  item: RescueItemPreview;
  horizontal?: boolean;
}) {
  const discount =
    item.originalPrice > 0
      ? Math.max(
          0,
          Math.round((1 - item.currentPrice / item.originalPrice) * 100),
        )
      : 0;
  const unavailable = item.status !== "active";
  const urgency =
    item.pickupEndAt !== undefined
      ? pickupUrgencyLabel(item.pickupEndAt, Date.now())
      : null;

  return (
    <Link
      to={`/item/${item.id}`}
      className={cn(
        "group grid h-full overflow-hidden rounded-xl border bg-card shadow-card transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        horizontal && "grid-cols-[7.5rem_1fr] sm:grid-cols-[9.5rem_1fr]",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          horizontal ? "h-full min-h-40" : "aspect-[4/3]",
        )}
      >
        <img
          src={item.image}
          alt={`Foto ${item.name} dari ${item.merchantName}`}
          width="800"
          height="600"
          loading="lazy"
          className={cn(
            "size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            unavailable && "grayscale",
          )}
        />
        <Badge className="absolute left-2.5 top-2.5 border-0 bg-brand-yellow px-1.5 text-[0.6875rem] font-bold text-brand-charcoal shadow-none hover:bg-brand-yellow">
          -{discount}%
        </Badge>
        {urgency !== null && !unavailable && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex min-h-6 items-center gap-1 rounded-full bg-warning px-2 text-[0.6875rem] font-semibold text-warning-foreground shadow-sm">
            <Timer className="size-3" aria-hidden="true" />
            {urgency}
          </span>
        )}
        {unavailable && (
          <span className="absolute inset-0 grid place-items-center bg-brand-charcoal/70 text-sm font-semibold text-white">
            Sudah habis
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 p-3">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {item.merchantName}
        </p>
        <h3 className="line-clamp-2 font-semibold leading-snug tracking-[-0.01em]">
          {item.name}
        </h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {item.distanceKm.toLocaleString("id-ID")} km
          <span aria-hidden="true">·</span>
          {formatWeight(item.weightPerItemGrams)} / paket
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-semibold tabular-nums text-leaf-700 dark:text-brand-mint">
            {formatIdr(item.currentPrice)}
          </span>
          <s className="text-xs tabular-nums text-muted-foreground">
            {formatIdr(item.originalPrice)}
          </s>
        </p>

        <div className="mt-auto space-y-1 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
          <p className="flex items-center gap-1.5 font-medium">
            <Clock3 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{item.pickupWindow}</span>
          </p>
          <p className="truncate text-muted-foreground">
            {item.remainingQuantity} paket tersisa
            {item.dietaryTags[0] !== undefined && (
              <> · {item.dietaryTags[0]}</>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
