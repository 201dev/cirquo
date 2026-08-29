import { ArrowLeft, CheckCircle2, ClipboardCheck, MapPin, Scale, XCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";
import { formatDistance, formatKg, formatPickupWindow, formatWibDate, formatWibTime } from "@/lib/format";
import { intakeSchema, outcomeSchema, recoveryNoteSchema } from "@/lib/validations";

type DeclineReason = "capacity" | "material_mismatch" | "distance" | "schedule" | "other";
type OutputType = "compost" | "bsf_larvae" | "animal_feed" | "biogas";
const outputLabels: Record<OutputType, string> = {
  compost: "Kompos", bsf_larvae: "Larva BSF", animal_feed: "Pakan ternak", biogas: "Biogas",
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function DetailSkeleton() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Memuat detail batch...</span>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

function RecoveryDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const batch = useQuery(
    api.recoveryBatches.get,
    id && sessionToken ? { batchId: id as Id<"recoveryBatches">, sessionToken } : "skip",
  );
  const accept = useMutation(api.recoveryBatches.accept);
  const decline = useMutation(api.recoveryBatches.decline);
  const logIntake = useMutation(api.recoveryBatches.logIntake);
  const logOutcome = useMutation(api.recoveryBatches.logOutcome);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [note, setNote] = useState("");
  const [estimatedCollectionAt, setEstimatedCollectionAt] = useState("");
  const [declineReason, setDeclineReason] = useState<DeclineReason>("capacity");
  const [measured, setMeasured] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("compost");
  const [outputWeight, setOutputWeight] = useState("");
  const [residualWeight, setResidualWeight] = useState("");
  const [zeroResidualConfirmed, setZeroResidualConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const first = batch?.allowedOutputTypes[0];
    if (first) setOutputType(first);
  }, [batch?.allowedOutputTypes]);

  if (batch === undefined) return <DetailSkeleton />;
  const currentBatch = batch;

  async function run(action: () => Promise<unknown>, success: string) {
    setSubmitting(true);
    setMutationError("");
    try {
      await action();
      setNote("");
      toast.success(success);
      return true;
    } catch (error) {
      const message = getErrorMessage(error, "Tindakan gagal. Coba lagi.");
      setMutationError(message);
      toast.error(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  function validateNote() {
    const result = recoveryNoteSchema.safeParse(note);
    if (!result.success) {
      setErrors({ note: result.error.issues[0]?.message ?? "Catatan tidak valid" });
      return false;
    }
    setErrors({});
    return true;
  }

  async function submitAccept(event: FormEvent) {
    event.preventDefault();
    if (!validateNote() || !sessionToken) return;
    const estimated = estimatedCollectionAt ? new Date(estimatedCollectionAt).getTime() : undefined;
    await run(
      () => accept({ batchId: currentBatch._id, sessionToken, estimatedCollectionAt: estimated, note: note || undefined }),
      "Offer diterima. Catat berat terukur saat batch tiba.",
    );
  }

  async function submitDecline() {
    if (!validateNote() || !sessionToken) return;
    if (await run(
      () => decline({ batchId: currentBatch._id, sessionToken, reason: declineReason, note: note || undefined }),
      "Offer ditolak dan dikirim kembali ke Circular Routing.",
    )) navigate("/processor/recovery");
  }

  async function submitIntake(event: FormEvent) {
    event.preventDefault();
    const parsed = intakeSchema.safeParse({ acceptedWeightGrams: Number(measured), note });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    if (!sessionToken) return;
    await run(
      () => logIntake({ batchId: currentBatch._id, sessionToken, acceptedWeightGrams: parsed.data.acceptedWeightGrams, note: parsed.data.note || undefined }),
      "Intake terukur berhasil dicatat.",
    );
  }

  async function submitOutcome(event: FormEvent) {
    event.preventDefault();
    const parsed = outcomeSchema.safeParse({
      outputType, outputWeightGrams: Number(outputWeight), residualWeightGrams: Number(residualWeight), note,
    });
    const nextErrors = parsed.success
      ? {}
      : Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    if (outputWeight === "") nextErrors.outputWeightGrams = "Berat output harus diisi";
    if (residualWeight === "") nextErrors.residualWeightGrams = "Berat residual harus diisi";
    if (residualWeight === "0" && !zeroResidualConfirmed) nextErrors.residualWeightGrams = "Konfirmasi Residual 0 gram terlebih dahulu";
    if (currentBatch.acceptedWeightGrams !== undefined && Number(outputWeight) + Number(residualWeight) > currentBatch.acceptedWeightGrams) nextErrors.outputWeightGrams = "Total output dan residual melebihi berat intake";
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length || !sessionToken) return;
    await run(
      () => logOutcome({ batchId: currentBatch._id, sessionToken, ...parsed.data, zeroResidualConfirmed, note: parsed.data.note || undefined }),
      "Outcome tersimpan dan Material Flow Ledger diperbarui.",
    );
  }

  const variance = batch.acceptedWeightGrams === undefined ? undefined : batch.acceptedWeightGrams - batch.offeredWeightGrams;

  return (
    <>
      <Button asChild variant="ghost" className="mb-2 -ml-3"><Link to="/processor/recovery"><ArrowLeft />Kembali</Link></Button>
      <PageHeader title={batch.itemName} description={`Dari ${batch.merchantName}`} action={<StatusBadge status={batch.status} />} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Rincian batch</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Berat deklarasi Merchant</dt><dd className="mt-1 text-xl font-semibold">{formatKg(batch.offeredWeightGrams)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Material</dt><dd className="mt-1 font-semibold">{batch.materialType.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Lokasi pickup</dt><dd className="mt-1 text-sm font-semibold"><MapPin className="mr-1 inline size-4" />{batch.pickupAddress}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Jadwal</dt><dd className="mt-1 text-sm font-semibold">{formatPickupWindow(batch.pickupStartAt, batch.pickupEndAt)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Jarak</dt><dd className="mt-1 font-semibold">{batch.distanceMeters === null ? "Belum tersedia" : formatDistance(batch.distanceMeters)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Circular Routing</dt><dd className="mt-1 font-semibold">Percobaan {batch.routingAttempts}</dd></div>
          </dl>

          {batch.acceptedWeightGrams !== undefined ? (
            <div className="mt-6 grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Dinyatakan Merchant</p><p className="font-semibold">{formatKg(batch.offeredWeightGrams)}</p></div>
              <div><p className="text-xs text-muted-foreground">Terukur di timbangan</p><p className="font-semibold">{formatKg(batch.acceptedWeightGrams)}</p></div>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Variansi {variance! >= 0 ? "+" : ""}{formatKg(variance!)} ({((variance! / batch.offeredWeightGrams) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%). Variansi material dicatat untuk rekonsiliasi, bukan dianggap kesalahan intake.
              </p>
            </div>
          ) : null}

          {batch.status === "processed" ? (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <CheckCircle2 className="size-7 text-primary" />
              <h2 className="mt-3 font-semibold">Outcome final tercatat</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted-foreground">Output usable</dt><dd className="font-semibold">{formatKg(batch.outputWeightGrams ?? 0)}</dd></div>
                <div><dt className="text-muted-foreground">Residual</dt><dd className="font-semibold">{formatKg(batch.residualWeightGrams ?? 0)}</dd></div>
                <div><dt className="text-muted-foreground">Process loss</dt><dd className="font-semibold">{formatKg(batch.processLossGrams ?? 0)}</dd></div>
                <div><dt className="text-muted-foreground">Konversi</dt><dd className="font-semibold">{batch.conversionRatePercent?.toLocaleString("id-ID")} %</dd></div>
              </dl>
            </div>
          ) : null}
        </section>

        <aside className="rounded-xl bg-secondary p-5">
          {mutationError ? <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-background p-3 text-sm text-destructive">{mutationError}</p> : null}

          {batch.status === "offered" ? (
            <form onSubmit={submitAccept}>
              <ClipboardCheck className="size-8 text-primary" />
              <h2 className="mt-3 font-semibold">Respons offer</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Berlaku sampai {batch.offerExpiresAt ? `${formatWibDate(batch.offerExpiresAt)}, ${formatWibTime(batch.offerExpiresAt)} WIB` : "waktu tidak tersedia"}.
              </p>
              <div className="mt-4 space-y-2"><Label htmlFor="estimated">Estimasi pengambilan (opsional)</Label><Input id="estimated" type="datetime-local" value={estimatedCollectionAt} onChange={(event) => setEstimatedCollectionAt(event.target.value)} /></div>
              <div className="mt-4 space-y-2"><Label htmlFor="note">Catatan (opsional)</Label><Textarea id="note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /><FieldError message={errors.note} /></div>
              <Button type="submit" disabled={submitting} className="mt-4 min-h-11 w-full"><CheckCircle2 />{submitting ? "Menyimpan..." : "Terima offer"}</Button>
              <div className="mt-5 border-t pt-5">
                <Label htmlFor="decline-reason">Alasan penolakan</Label>
                <Select value={declineReason} onValueChange={(value) => setDeclineReason(value as DeclineReason)}>
                  <SelectTrigger id="decline-reason" className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="capacity">Kapasitas tidak cukup</SelectItem><SelectItem value="material_mismatch">Material tidak sesuai</SelectItem><SelectItem value="distance">Jarak terlalu jauh</SelectItem><SelectItem value="schedule">Jadwal tidak sesuai</SelectItem><SelectItem value="other">Alasan lain</SelectItem></SelectContent>
                </Select>
                <Button type="button" variant="outline" disabled={submitting} className="mt-3 min-h-11 w-full" onClick={submitDecline}><XCircle />Tolak dan routing ulang</Button>
              </div>
            </form>
          ) : null}

          {batch.status === "accepted" ? (
            <form onSubmit={submitIntake}>
              <Scale className="size-7 text-primary" /><h2 className="mt-3 font-semibold">Catat intake terukur</h2>
              <p className="mt-1 text-sm text-muted-foreground">Masukkan berat aktual dari timbangan fisik, bukan estimasi Merchant.</p>
              <div className="mt-5 space-y-2"><Label htmlFor="measured">Berat dari timbangan (gram)</Label><Input id="measured" type="number" min="1" step="1" inputMode="numeric" value={measured} onChange={(event) => setMeasured(event.target.value)} /><FieldError message={errors.acceptedWeightGrams} /></div>
              <div className="mt-4 space-y-2"><Label htmlFor="intake-note">Catatan (opsional)</Label><Textarea id="intake-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /><FieldError message={errors.note} /></div>
              <Button type="submit" disabled={submitting} className="mt-5 min-h-11 w-full">{submitting ? "Menyimpan..." : "Simpan intake"}</Button>
            </form>
          ) : null}

          {batch.status === "collected" ? (
            <form onSubmit={submitOutcome}>
              <ClipboardCheck className="size-8 text-primary" /><h2 className="mt-3 font-semibold">Catat outcome</h2>
              <p className="mt-1 text-sm text-muted-foreground">Output usable, residual, dan process loss tetap dipisahkan.</p>
              {batch.allowedOutputTypes.length ? <div className="mt-5 space-y-2"><Label>Jenis output</Label><Select value={outputType} onValueChange={(value) => setOutputType(value as OutputType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{batch.allowedOutputTypes.map((type) => <SelectItem key={type} value={type}>{outputLabels[type]}</SelectItem>)}</SelectContent></Select></div> : <p role="alert" className="mt-5 text-sm text-destructive">Profil fasilitas belum memiliki jenis output yang didukung.</p>}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2"><Label htmlFor="output">Output usable (gram)</Label><Input id="output" type="number" min="0" step="1" inputMode="numeric" value={outputWeight} onChange={(event) => setOutputWeight(event.target.value)} /><FieldError message={errors.outputWeightGrams} /></div>
                <div className="space-y-2"><Label htmlFor="residual">Residual (gram)</Label><Input id="residual" type="number" min="0" step="1" inputMode="numeric" value={residualWeight} onChange={(event) => setResidualWeight(event.target.value)} /><FieldError message={errors.residualWeightGrams} /></div>
              </div>
              {outputWeight !== "" && residualWeight !== "" && batch.acceptedWeightGrams !== undefined ? <p className="mt-3 rounded-lg bg-background p-3 text-xs text-muted-foreground">Process loss: {formatKg(Math.max(0, batch.acceptedWeightGrams - Number(outputWeight) - Number(residualWeight)))}</p> : null}
              {residualWeight === "0" ? <label className="mt-3 flex min-h-11 items-center gap-3 rounded-lg border bg-background p-3 text-xs"><input type="checkbox" checked={zeroResidualConfirmed} onChange={(event) => setZeroResidualConfirmed(event.target.checked)} className="size-4 accent-primary" />Saya memastikan timbangan menunjukkan Residual 0 gram.</label> : null}
              <div className="mt-4 space-y-2"><Label htmlFor="outcome-note">Catatan (opsional)</Label><Textarea id="outcome-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /><FieldError message={errors.note} /></div>
              <Button type="submit" disabled={submitting || !batch.allowedOutputTypes.length} className="mt-5 min-h-11 w-full">{submitting ? "Menyimpan..." : "Simpan outcome final"}</Button>
            </form>
          ) : null}

          {batch.status === "processed" ? <div><CheckCircle2 className="size-8 text-primary" /><h2 className="mt-3 font-semibold">Batch selesai diproses</h2><p className="mt-1 text-sm text-muted-foreground">Catatan terminal bersifat immutable. Koreksi memerlukan event kompensasi.</p></div> : null}
        </aside>
      </div>
    </>
  );
}

export default function RecoveryDetailPage() {
  return <QueryErrorBoundary title="Detail batch tidak dapat dimuat"><RecoveryDetailContent /></QueryErrorBoundary>;
}
