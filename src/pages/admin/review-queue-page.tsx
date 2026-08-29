import { Check, FileWarning, ShieldCheck, UserRoundCheck, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";
import { formatWeight, formatWibDateTime } from "@/lib/format";

type Partner = {
  kind: "merchant" | "processor";
  entityId: Id<"merchants"> | Id<"processors">;
  ownerId: Id<"users">;
  ownerName: string;
  ownerEmail: string;
  name: string;
  city: string | null;
  address: string | null;
  verificationStatus: string;
  businessType: string | null;
  facilityType: string | null;
  dailyCapacityGrams: number | null;
};

function LoadingRows() {
  return <div role="status" aria-label="Memuat antrean" className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div>;
}

function VerificationQueue({ sessionToken }: { sessionToken: string }) {
  const pending = useQuery(api.admin.listPendingVerifications, { sessionToken });
  const accounts = useQuery(api.admin.listPartnerAccounts, { sessionToken });
  const verifyMerchant = useMutation(api.admin.verifyMerchant);
  const verifyProcessor = useMutation(api.admin.verifyProcessor);
  const rejectAccount = useMutation(api.admin.rejectAccount);
  const suspendUser = useMutation(api.admin.suspendUser);
  const [busy, setBusy] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ partner: Partner; mode: "reject" | "suspend" | "reinstate" } | null>(null);
  const [reason, setReason] = useState("");

  if (pending === undefined || accounts === undefined) return <LoadingRows />;

  const approve = async (partner: Partner) => {
    setBusy(String(partner.entityId));
    try {
      if (partner.kind === "merchant") await verifyMerchant({ sessionToken, merchantId: partner.entityId as Id<"merchants"> });
      else await verifyProcessor({ sessionToken, processorId: partner.entityId as Id<"processors"> });
      toast.success(`${partner.name} berhasil diverifikasi.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Verifikasi gagal."));
    } finally {
      setBusy(null);
    }
  };

  const confirmDecision = async () => {
    if (!decision) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 10 || cleanReason.length > 500) return toast.error("Alasan harus 10-500 karakter.");
    setBusy(String(decision.partner.entityId));
    try {
      if (decision.mode === "reject") {
        await rejectAccount({ sessionToken, kind: decision.partner.kind, entityId: decision.partner.entityId, reason: cleanReason });
        toast.success("Permohonan ditolak dan alasan dikirim.");
      } else {
        await suspendUser({ sessionToken, userId: decision.partner.ownerId, suspend: decision.mode === "suspend", reason: cleanReason });
        toast.success(decision.mode === "suspend" ? "Akun ditangguhkan dan semua sesi dicabut." : "Akun diaktifkan kembali untuk verifikasi ulang.");
      }
      setDecision(null);
      setReason("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Keputusan tidak dapat disimpan."));
    } finally {
      setBusy(null);
    }
  };

  const row = (partner: Partner, pendingReview: boolean) => <article key={`${partner.kind}-${partner.entityId}`} className="rounded-xl border bg-card p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><ShieldCheck className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{partner.name}</h2><StatusBadge status={partner.verificationStatus} /></div><p className="mt-1 break-all text-sm text-muted-foreground">{partner.kind === "merchant" ? "Merchant" : "Organic Processor"} · {partner.ownerName} · {partner.ownerEmail}</p><p className="mt-2 text-xs text-muted-foreground">{partner.address ?? partner.city ?? "Alamat belum tersedia"}{partner.dailyCapacityGrams ? ` · Kapasitas ${formatWeight(partner.dailyCapacityGrams)}/hari` : ""}</p></div><div className="flex w-full gap-2 sm:w-auto">{pendingReview ? <><Button variant="outline" className="flex-1 sm:flex-none" disabled={busy === String(partner.entityId)} onClick={() => setDecision({ partner, mode: "reject" })}><X /> Tolak</Button><Button className="flex-1 sm:flex-none" disabled={busy === String(partner.entityId)} onClick={() => approve(partner)}><Check /> Setujui</Button></> : <Button variant="outline" className="w-full sm:w-auto" disabled={busy === String(partner.entityId)} onClick={() => setDecision({ partner, mode: partner.verificationStatus === "suspended" ? "reinstate" : "suspend" })}>{partner.verificationStatus === "suspended" ? "Aktifkan kembali" : "Tangguhkan"}</Button>}</div></div></article>;

  return <><section aria-labelledby="pending-title"><h2 id="pending-title" className="text-lg font-semibold">Menunggu keputusan</h2><div className="mt-3 space-y-3">{pending.length ? pending.map((partner) => row(partner, true)) : <p role="status" className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada permohonan verifikasi yang menunggu.</p>}</div></section><section className="mt-8" aria-labelledby="accounts-title"><h2 id="accounts-title" className="text-lg font-semibold">Akun mitra</h2><p className="mt-1 text-sm text-muted-foreground">Suspend atau aktifkan kembali tanpa mengubah riwayat material.</p><div className="mt-3 space-y-3">{accounts.length ? accounts.map((partner) => row(partner, false)) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada akun mitra yang sudah diputuskan.</p>}</div></section><Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}><DialogContent><DialogHeader><DialogTitle>{decision?.mode === "reject" ? "Tolak verifikasi" : decision?.mode === "suspend" ? "Tangguhkan akun" : "Aktifkan kembali akun"}</DialogTitle><DialogDescription>Alasan 10-500 karakter akan disimpan pada audit Admin dan ditampilkan kepada pemilik akun.</DialogDescription></DialogHeader><label className="text-sm font-medium">Alasan<Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28" maxLength={500} /></label><DialogFooter><Button variant="outline" onClick={() => setDecision(null)}>Batal</Button><Button onClick={confirmDecision} disabled={!decision || busy !== null}>Simpan keputusan</Button></DialogFooter></DialogContent></Dialog></>;
}

function ModerationQueue({ sessionToken }: { sessionToken: string }) {
  const items = useQuery(api.admin.listModeratableListings, { sessionToken });
  const moderate = useMutation(api.admin.moderateListing);
  const [selected, setSelected] = useState<NonNullable<typeof items>[number] | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (items === undefined) return <LoadingRows />;
  const submit = async () => {
    if (!selected) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 10 || cleanReason.length > 500) return toast.error("Alasan moderasi harus 10-500 karakter.");
    setBusy(true);
    try {
      const result = await moderate({ sessionToken, surplusItemId: selected.surplusItemId, reason: cleanReason });
      toast.success(`${formatWeight(result.moderatedWeightGrams)} material unresolved dimoderasi.`);
      setSelected(null);
      setReason("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Moderasi gagal."));
    } finally {
      setBusy(false);
    }
  };
  return <><div className="space-y-3">{items.length ? items.map((item) => <article key={item.surplusItemId} className="rounded-xl border bg-card p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><FileWarning className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.name}</h2><StatusBadge status={item.status} /></div><p className="mt-1 text-sm text-muted-foreground">{item.merchantName} · {item.remainingQuantity} porsi · {formatWeight(item.weightPerItemGrams)} per porsi</p><p className="mt-1 text-xs text-muted-foreground">Pickup selesai {formatWibDateTime(item.pickupEndAt)}</p></div><Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelected(item)}><FileWarning /> Moderasi</Button></div></article>) : <p role="status" className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada Rescue Item aktif yang dapat dimoderasi.</p>}</div><Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>Moderasi {selected?.name}</DialogTitle><DialogDescription>Tindakan ini terminal. Material unresolved menjadi Residual, order belum terpenuhi masuk jalur refund M4, dan ledger tidak dapat diedit.</DialogDescription></DialogHeader><label className="text-sm font-medium">Alasan untuk Merchant<Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28" maxLength={500} /></label><DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Batal</Button><Button variant="destructive" onClick={submit} disabled={busy}>{busy ? "Memproses..." : "Konfirmasi moderasi"}</Button></DialogFooter></DialogContent></Dialog></>;
}

function ReviewContent({ type }: { type: "verifications" | "moderation" }) {
  const { sessionToken } = useAuth();
  if (!sessionToken) return null;
  return type === "verifications" ? <VerificationQueue sessionToken={sessionToken} /> : <ModerationQueue sessionToken={sessionToken} />;
}

export default function ReviewQueuePage({ type }: { type: "verifications" | "moderation" }) {
  const verification = type === "verifications";
  return <><PageHeader title={verification ? "Verifikasi mitra" : "Moderasi Rescue Item"} description={verification ? "Setujui, tolak, suspend, dan aktifkan kembali Merchant atau Organic Processor." : "Tutup Rescue Item bermasalah secara terminal dengan alasan yang dapat dilihat Merchant."} action={verification ? <UserRoundCheck className="size-6 text-primary" /> : <FileWarning className="size-6 text-primary" />} /><QueryErrorBoundary title="Antrean Admin tidak dapat dimuat"><ReviewContent type={type} /></QueryErrorBoundary></>;
}
