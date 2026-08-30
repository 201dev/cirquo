import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-rescued/15 text-foreground border-rescued/30",
  paid: "bg-in-progress/15 text-foreground border-in-progress/30",
  picked_up: "bg-rescued/15 text-foreground border-rescued/30",
  processed: "bg-recovered/20 text-foreground border-recovered/35",
  PROCESSED: "bg-recovered/20 text-foreground border-recovered/35",
  RESCUED: "bg-rescued/15 text-foreground border-rescued/30",
  ROUTED: "bg-in-progress/15 text-foreground border-in-progress/30",
  ROUTING_FAILED: "bg-destructive/10 text-destructive border-destructive/30",
  MODERATED: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap bg-muted/70 font-medium",
        statusStyles[status],
        className,
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}
