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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import {
  REVIEW_REASON_MAX,
  REVIEW_REASON_MIN,
  VERIFICATION_NOTE_MAX,
  formatWaitingTime,
  partnerTypeLabel,
  reviewReasonError,
  verificationNoteError,
} from "@/lib/admin-review";
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
  latitude: number | null;
  longitude: number | null;
  verificationStatus: string;
  businessType: string | null;
  facilityType: string | null;
  acceptedMaterialTypes: string[];
  dailyCapacityGrams: number | null;
  maxPickupRadiusMeters: number | null;
  outputTypes: string[];
  operatingHoursStart: number | null;
  operatingHoursEnd: number | null;
  profileComplete: boolean;
  rejectionReason: string | null;
  verificationNote: string | null;
  createdAt: number;
};

type DecisionMode = "approve" | "reject" | "suspend" | "reinstate";

/**
 * Dialog copy per decision. Suspension and rejection state their side effects
 * up front: an Admin has to know the owner is signed out of every device and
 * that unfinished listings stop, before confirming rather than afterwards.
 */
const DECISION_COPY: Record<
  DecisionMode,
  { title: string; description: string; label: string; confirm: string; destructive: boolean }
> = {
  approve: {
    title: "Setujui verifikasi",
    description:
      "Akun langsung dapat beroperasi. Catatan bersifat opsional dan tersimpan pada audit Admin.",
    label: "Catatan verifikasi (opsional)",
    confirm: "Setujui",
    destructive: false,
  },
  reject: {
    title: "Tolak verifikasi",
    description:
      "Alasan tersimpan pada audit Admin dan ditampilkan kepada pemilik akun agar dapat diperbaiki lalu diajukan ulang.",
    label: "Alasan penolakan",
    confirm: "Tolak permohonan",
    destructive: true,
  },
  suspend: {
    title: "Tangguhkan akun",
    description:
      "Semua sesi pemilik akun dicabut sehingga ia langsung keluar dari seluruh perangkat, dan listing atau recovery batch yang belum selesai ikut terhenti. Riwayat material tidak berubah.",
    label: "Alasan penangguhan",
    confirm: "Tangguhkan",
    destructive: true,
  },
  reinstate: {
    title: "Aktifkan kembali akun",
    description:
      "Akun kembali menunggu verifikasi dan perlu diputuskan ulang. Alasan tersimpan pada audit Admin.",
    label: "Alasan pengaktifan",
    confirm: "Aktifkan kembali",
    destructive: false,
  },
};

function LoadingRows() {
  return (
    <div role="status" aria-label="Memuat antrean" className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

function PartnerCard({
  partner,
  pendingReview,
  busy,
  now,
  onDecide,
}: {
  partner: Partner;
  pendingReview: boolean;
  busy: boolean;
  now: number;
  onDecide: (mode: DecisionMode) => void;
}) {
  const suspended = partner.verificationStatus === "suspended";
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{partner.name}</h3>
            <StatusBadge status={partner.verificationStatus} />
          </div>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {partnerTypeLabel(partner)} · {partner.ownerName} · {partner.ownerEmail}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {partner.address ?? partner.city ?? "Alamat belum tersedia"}
            {partner.latitude !== null && partner.longitude !== null
              ? ` · ${partner.latitude.toFixed(5)}, ${partner.longitude.toFixed(5)}`
              : " · Koordinat belum tersedia"}
            {partner.dailyCapacityGrams
              ? ` · Kapasitas ${formatWeight(partner.dailyCapacityGrams)}/hari`
              : ""}
          </p>
          {partner.kind === "processor" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Material: {partner.acceptedMaterialTypes.join(", ") || "belum diisi"} · Output: {partner.outputTypes.join(", ") || "belum diisi"}
              {partner.maxPickupRadiusMeters ? ` · Radius ${partner.maxPickupRadiusMeters.toLocaleString("id-ID")} m` : ""}
            </p>
          ) : null}
          <p className={`mt-1 text-xs ${partner.profileComplete ? "text-muted-foreground" : "text-destructive"}`}>
            {partner.profileComplete ? "Profil lengkap untuk ditinjau." : "Profil belum lengkap; verifikasi akan ditolak sampai data diperbarui."}
          </p>
          {partner.rejectionReason ? <p className="mt-1 text-xs text-destructive">Alasan penolakan: {partner.rejectionReason}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Mendaftar {formatWibDateTime(partner.createdAt)} ·{" "}
            {pendingReview ? "menunggu" : "terdaftar"}{" "}
            {formatWaitingTime(partner.createdAt, now)}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {pendingReview ? (
            <>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                disabled={busy}
                onClick={() => onDecide("reject")}
              >
                <X /> Tolak
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                disabled={busy}
                onClick={() => onDecide("approve")}
              >
                <Check /> Setujui
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => onDecide(suspended ? "reinstate" : "suspend")}
            >
              {suspended ? "Aktifkan kembali" : "Tangguhkan"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function VerificationQueue({ sessionToken }: { sessionToken: string }) {
  const merchantPending = useQuery(api.admin.listPendingVerifications, { sessionToken, kind: "merchant" });
  const processorPending = useQuery(api.admin.listPendingVerifications, { sessionToken, kind: "processor" });
  const accounts = useQuery(api.admin.listUsers, { sessionToken });
  const verifyMerchant = useMutation(api.admin.verifyMerchant);
  const verifyProcessor = useMutation(api.admin.verifyProcessor);
  const rejectAccount = useMutation(api.admin.rejectAccount);
  const suspendUser = useMutation(api.admin.suspendUser);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ partner: Partner; mode: DecisionMode } | null>(null);
  const [reason, setReason] = useState("");

  if (merchantPending === undefined || processorPending === undefined || accounts === undefined) return <LoadingRows />;

  const now = Date.now();
  const copy = decision ? DECISION_COPY[decision.mode] : null;
  const optional = decision?.mode === "approve";
  const limit = optional ? VERIFICATION_NOTE_MAX : REVIEW_REASON_MAX;
  const error = decision
    ? optional
      ? verificationNoteError(reason)
      : reviewReasonError(reason)
    : null;
  // Only nag once there is something to be wrong about; an untouched field
  // shows the requirement instead of an error.
  const showError = error !== null && reason.trim().length > 0;

  /** Always clears the reason: the next partner must start from a blank field. */
  const openDialog = (partner: Partner, mode: DecisionMode) => {
    setDecision({ partner, mode });
    setReason("");
  };

  const closeDialog = () => {
    setDecision(null);
    setReason("");
  };

  const confirm = async () => {
    if (!decision || error !== null) return;
    const trimmed = reason.trim();
    const { partner, mode } = decision;
    setBusyId(String(partner.entityId));
    try {
      if (mode === "approve") {
        const note = trimmed.length > 0 ? trimmed : undefined;
        if (partner.kind === "merchant") {
          await verifyMerchant({ sessionToken, merchantId: partner.entityId as Id<"merchants">, note });
        } else {
          await verifyProcessor({ sessionToken, processorId: partner.entityId as Id<"processors">, note });
        }
        toast.success(`${partner.name} berhasil diverifikasi.`);
      } else if (mode === "reject") {
        await rejectAccount({ sessionToken, kind: partner.kind, entityId: partner.entityId, reason: trimmed });
        toast.success("Permohonan ditolak dan alasan dikirim ke pemilik akun.");
      } else {
        const result = await suspendUser({ sessionToken, userId: partner.ownerId, suspend: mode === "suspend", reason: trimmed });
        toast.success(
          mode === "suspend"
            ? `Akun ditangguhkan · ${result.sessionsRevoked} sesi dicabut · ${result.affectedListings} listing dan ${result.affectedBatches} recovery batch terdampak.`
            : "Akun diaktifkan kembali dan menunggu verifikasi ulang.",
        );
      }
      closeDialog();
    } catch (caught) {
      toast.error(getErrorMessage(caught, "Keputusan tidak dapat disimpan."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <section aria-labelledby="pending-title">
        <h2 id="pending-title" className="text-lg font-semibold">
          Menunggu keputusan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {merchantPending.length + processorPending.length
            ? `${merchantPending.length + processorPending.length} permohonan, diurutkan dari yang paling lama menunggu per peran.`
            : "Diurutkan dari permohonan yang paling lama menunggu."}
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          {([
            ["Merchant", merchantPending],
            ["Organic Processor", processorPending],
          ] as ReadonlyArray<readonly [string, Partner[]]>).map(([label, partners]) => (
            <section key={label} aria-label={`Antrean verifikasi ${label}`}>
              <h3 className="text-sm font-semibold">{label}</h3>
              <div className="mt-3 space-y-3">
                {partners.length ? partners.map((partner) => (
                  <PartnerCard key={`${partner.kind}-${partner.entityId}`} partner={partner} pendingReview busy={busyId === String(partner.entityId)} now={now} onDecide={(mode) => openDialog(partner, mode)} />
                )) : (
                  <p role="status" className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada permohonan {label.toLowerCase()} yang menunggu.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="accounts-title">
        <h2 id="accounts-title" className="text-lg font-semibold">
          Akun mitra
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tangguhkan atau aktifkan kembali tanpa mengubah riwayat material.
        </p>
        <div className="mt-3 space-y-3">
          {accounts.length ? (
            accounts.map((partner) => (
              <PartnerCard
                key={`${partner.kind}-${partner.entityId}`}
                partner={partner}
                pendingReview={false}
                busy={busyId === String(partner.entityId)}
                now={now}
                onDecide={(mode) => openDialog(partner, mode)}
              />
            ))
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Belum ada akun mitra yang sudah diputuskan.
            </p>
          )}
        </div>
      </section>

      <Dialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy?.title}</DialogTitle>
            <DialogDescription>{copy?.description}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            <span className="font-medium">{decision?.partner.name}</span>
            <span className="block break-all text-xs text-muted-foreground">
              {decision?.partner.ownerName} · {decision?.partner.ownerEmail}
            </span>
          </p>
          <div>
            <label htmlFor="decision-reason" className="text-sm font-medium">
              {copy?.label}
            </label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-28"
              maxLength={limit}
              aria-invalid={showError}
              aria-describedby="decision-reason-help"
            />
            <p
              id="decision-reason-help"
              role={showError ? "alert" : undefined}
              className={`mt-2 text-xs ${showError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {showError
                ? error
                : optional
                  ? `${reason.trim().length} dari ${limit} karakter, boleh dikosongkan.`
                  : `${reason.trim().length} dari ${limit} karakter, minimal ${REVIEW_REASON_MIN}.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button
              variant={copy?.destructive ? "destructive" : "default"}
              onClick={confirm}
              disabled={busyId !== null || error !== null}
            >
              {busyId !== null ? "Memproses..." : copy?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModerationQueue({ sessionToken }: { sessionToken: string }) {
  const items = useQuery(api.admin.listModeratableListings, { sessionToken });
  const moderate = useMutation(api.admin.moderateListing);
  const [selected, setSelected] = useState<NonNullable<typeof items>[number] | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (items === undefined) return <LoadingRows />;

  const error = reviewReasonError(reason);
  const showError = error !== null && reason.trim().length > 0;

  const openDialog = (item: NonNullable<typeof items>[number]) => {
    setSelected(item);
    setReason("");
  };

  const closeDialog = () => {
    setSelected(null);
    setReason("");
  };

  const submit = async () => {
    if (!selected || error !== null) return;
    setBusy(true);
    try {
      const result = await moderate({
        sessionToken,
        surplusItemId: selected.surplusItemId,
        reason: reason.trim(),
      });
      toast.success(
        `${formatWeight(result.moderatedWeightGrams)} material unresolved dimoderasi · ${result.ordersRefunded} order masuk jalur refund · ${result.batchesCancelled} recovery batch dibatalkan.`,
      );
      closeDialog();
    } catch (caught) {
      toast.error(getErrorMessage(caught, "Moderasi gagal."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <article key={item.surplusItemId} className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  <FileWarning className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.name}</h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.merchantName} · {item.remainingQuantity} porsi ·{" "}
                    {formatWeight(item.weightPerItemGrams)} per porsi
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pickup selesai {formatWibDateTime(item.pickupEndAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => openDialog(item)}
                >
                  <FileWarning /> Moderasi
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p
            role="status"
            className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
          >
            Tidak ada Rescue Item aktif yang dapat dimoderasi.
          </p>
        )}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderasi {selected?.name}</DialogTitle>
            <DialogDescription>
              Tindakan ini terminal. Material unresolved menjadi Residual, order yang belum
              terpenuhi masuk jalur refund M4, dan event ledger tidak dapat diedit setelahnya.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="moderation-reason" className="text-sm font-medium">
              Alasan untuk Merchant
            </label>
            <Textarea
              id="moderation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-28"
              maxLength={REVIEW_REASON_MAX}
              aria-invalid={showError}
              aria-describedby="moderation-reason-help"
            />
            <p
              id="moderation-reason-help"
              role={showError ? "alert" : undefined}
              className={`mt-2 text-xs ${showError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {showError
                ? error
                : `${reason.trim().length} dari ${REVIEW_REASON_MAX} karakter, minimal ${REVIEW_REASON_MIN}.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button variant="destructive" onClick={submit} disabled={busy || error !== null}>
              {busy ? "Memproses..." : "Konfirmasi moderasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReviewContent({ type }: { type: "verifications" | "moderation" }) {
  const { sessionToken } = useAuth();
  if (!sessionToken) return null;
  return type === "verifications" ? (
    <VerificationQueue sessionToken={sessionToken} />
  ) : (
    <ModerationQueue sessionToken={sessionToken} />
  );
}

export default function ReviewQueuePage({ type }: { type: "verifications" | "moderation" }) {
  const verification = type === "verifications";
  return (
    <>
      <PageHeader
        title={verification ? "Verifikasi mitra" : "Moderasi Rescue Item"}
        description={
          verification
            ? "Setujui, tolak, tangguhkan, dan aktifkan kembali Merchant atau Organic Processor."
            : "Tutup Rescue Item bermasalah secara terminal dengan alasan yang dapat dilihat Merchant."
        }
        action={
          verification ? (
            <UserRoundCheck className="size-6 text-primary" />
          ) : (
            <FileWarning className="size-6 text-primary" />
          )
        }
      />
      <QueryErrorBoundary title="Antrean Admin tidak dapat dimuat">
        <ReviewContent type={type} />
      </QueryErrorBoundary>
    </>
  );
}
