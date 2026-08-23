import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  draft: "Draf",
  active: "Aktif",
  sold_out: "Habis",
  expired: "Kedaluwarsa",
  recovery_pending: "Menunggu recovery",
  closed: "Ditutup",
  reserved: "Direservasi",
  paid: "Siap diambil",
  picked_up: "Terselamatkan",
  cancelled: "Dibatalkan",
  pending: "Menunggu",
  offered: "Ditawarkan",
  accepted: "Diterima",
  collected: "Sudah diambil",
  processed: "Terolah",
  unroutable: "Tidak ter-rute",
  LISTED: "Tercatat",
  RESERVED: "Direservasi",
  RESCUED: "Terselamatkan",
  ROUTED: "Circular Routing",
  PROCESSED: "Terolah",
};

const statusStyles: Record<string, string> = {
  active: "bg-rescued/15 text-foreground border-rescued/30",
  paid: "bg-in-progress/15 text-foreground border-in-progress/30",
  picked_up: "bg-rescued/15 text-foreground border-rescued/30",
  processed: "bg-recovered/20 text-foreground border-recovered/35",
  PROCESSED: "bg-recovered/20 text-foreground border-recovered/35",
  RESCUED: "bg-rescued/15 text-foreground border-rescued/30",
  ROUTED: "bg-in-progress/15 text-foreground border-in-progress/30",
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
      {statusLabels[status] ?? status}
    </Badge>
  );
}
