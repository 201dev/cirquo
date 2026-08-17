import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AppLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-md font-semibold tracking-[-0.02em] text-foreground",
        className,
      )}
      aria-label="Cirquo, ke beranda"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_7px_16px_-9px_color-mix(in_oklab,var(--primary)_80%,transparent)]">
        <Leaf className="size-[18px]" aria-hidden="true" />
      </span>
      {!compact ? <span className="text-xl">Cirquo</span> : null}
    </Link>
  );
}
