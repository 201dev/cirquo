import { MapPin, Package } from "lucide-react";
import { Link } from "react-router-dom";
import type { MerchantGroup } from "@/lib/discovery";
import { formatDistance, formatIdr } from "@/lib/format";
import { rescueItemImageForMaterialType } from "@/lib/rescue-item-images";

/**
 * A merchant as discovery knows it: name, where it is, how far, and what it has
 * on offer right now. Distance and counts come from the merchant's own live
 * items, so a row never advertises stock that discovery has already filtered
 * out. Cirquo has no rating system, so no row shows one.
 */
export function MerchantCard({ merchant }: { merchant: MerchantGroup }) {
  return (
    <Link
      to={`/merchant/${merchant.id}`}
      className="group grid grid-cols-[4.5rem_1fr] items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[5.5rem_1fr] sm:gap-4"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        <img
          src={
            merchant.imageUrl ||
            rescueItemImageForMaterialType(merchant.materialType)
          }
          alt=""
          width="176"
          height="176"
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-semibold leading-snug">{merchant.name}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {merchant.address}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {formatDistance(merchant.distanceMeters)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Package className="size-3.5 shrink-0" aria-hidden="true" />
            {merchant.itemCount} item aktif
          </span>
          <span aria-hidden="true">·</span>
          <span>
            mulai{" "}
            <span className="font-semibold text-foreground">
              {formatIdr(merchant.cheapestPrice)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
