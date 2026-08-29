import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  draft: "Draf",
  active: "Aktif",
  sold_out: "Habis",
  expired: "Kedaluwarsa",
  recovery_pending: "Menunggu recovery",
  recovered: "Recovered",
  residual: "Residual",
  closed: "Ditutup",
  reserved: "Direservasi",
  paid: "Siap diambil",
  picked_up: "Terselamatkan",
  cancelled: "Dibatalkan",
  pending: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  suspended: "Ditangguhkan",
  offered: "Ditawarkan",
  accepted: "Diterima",
  collected: "Sudah diambil",
  processed: "Terolah",
  unroutable: "Routing gagal",
  moderated: "Dimoderasi",
  LISTED: "Tercatat",
  PRICE_ADJUSTED: "Harga disesuaikan",
  RESERVED: "Direservasi",
  PAID: "Dibayar",
  RESCUED: "Terselamatkan",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  ROUTED: "Circular Routing",
  ROUTING_FAILED: "Routing gagal",
  INTAKE_ACCEPTED: "Intake diterima",
  INTAKE_DECLINED: "Intake ditolak",
  PROCESSED: "Terolah",
  MODERATED: "Dimoderasi",
};

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
      {statusLabels[status] ?? status}
    </Badge>
  );
}
