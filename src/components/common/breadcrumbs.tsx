import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export type Crumb = {
  label: string;
  /** Omit on the current page — the last crumb is never a link. */
  to?: string;
};

/**
 * Trail of links above a page title. Replaces the standalone "Kembali" buttons,
 * which told you there was a way back but not where back was.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
              )}
              {crumb.to !== undefined && !isLast ? (
                <Link
                  to={crumb.to}
                  className="rounded hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="truncate font-medium text-foreground"
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
