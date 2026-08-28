import { Link } from "react-router-dom";
import cirquoMark from "@/assets/brand/cirquo-mark.svg";
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
        "inline-flex min-h-11 items-center gap-2.5 rounded-md font-bold tracking-[-0.025em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="Cirquo, ke beranda"
    >
      <img
        src={cirquoMark}
        alt=""
        width="38"
        height="42"
        className="h-10 w-auto shrink-0"
      />
      {!compact ? <span className="text-[1.35rem] text-current">Cirquo</span> : null}
    </Link>
  );
}
