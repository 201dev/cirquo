/**
 * Indonesian wording for every lifecycle status and ledger event type. Lives
 * outside the badge component so plain text surfaces — filter buttons, aria
 * labels — can name a status without rendering a badge, and so adding a status
 * means touching one map.
 */
const STATUS_LABELS: Record<string, string> = {
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

/**
 * Falls back to the raw value rather than a guess: an unmapped status shows the
 * code an Admin can search for, instead of silently reading as something else.
 */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
