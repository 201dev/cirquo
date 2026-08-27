import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Scale,
  XCircle,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKg, recoveryBatches } from "@/constants/mock-data";

type DemoStep = "review" | "intake" | "outcome" | "processed" | "declined";
const outcomeLabels = {
  compost: "Kompos",
  bsf_larvae: "Larva BSF",
  animal_feed: "Pakan ternak",
  biogas: "Biogas",
} as const;
type Outcome = keyof typeof outcomeLabels;

export default function RecoveryDetailPage() {
  const { id } = useParams();
  const batch = recoveryBatches.find((candidate) => candidate.id === id);
  const [step, setStep] = useState<DemoStep>(
    batch?.status === "processed" ? "processed" : "review",
  );
  const [measured, setMeasured] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("compost");
  const [outputWeight, setOutputWeight] = useState("");
  const [residualWeight, setResidualWeight] = useState("");
  const [zeroResidualConfirmed, setZeroResidualConfirmed] = useState(false);

  if (!batch) return <PageHeader title="Batch tidak ditemukan" />;

  function submitIntake(event: FormEvent) {
    event.preventDefault();
    if (!measured || Number(measured) <= 0)
      return toast.error("Masukkan berat intake yang valid.");
    setStep("outcome");
    toast.success("Intake demo tervalidasi. Lanjutkan dengan outcome.");
  }

  function submitOutcome(event: FormEvent) {
    event.preventDefault();
    const total = Number(outputWeight) + Number(residualWeight);
    if (outputWeight === "" || residualWeight === "") {
      return toast.error(
        "Isi berat terolah dan Residu, termasuk bila nilainya 0.",
      );
    }
    if (Number(outputWeight) < 0 || Number(residualWeight) < 0) {
      return toast.error("Berat outcome tidak boleh negatif.");
    }
    if (total > Number(measured)) {
      return toast.error("Total outcome tidak boleh melebihi berat intake.");
    }
    if (Number(residualWeight) === 0 && !zeroResidualConfirmed) {
      return toast.error("Konfirmasi dahulu karena Residu 0 gram tidak umum.");
    }
    setStep("processed");
    toast.success(
      "Outcome demo lengkap. PROCESSED akan ditulis bersama metadata berat.",
    );
  }

  const status =
    step === "review"
      ? "offered"
      : step === "declined"
        ? "pending"
        : step === "processed"
          ? "processed"
          : step === "outcome"
            ? "collected"
            : "accepted";

  return (
    <>
      <Button asChild variant="ghost" className="mb-2 -ml-3">
        <Link to="/processor/recovery">
          <ArrowLeft />
          Kembali
        </Link>
      </Button>
      <PageHeader
        title={batch.itemName}
        description={`Permintaan dari ${batch.merchantName} · ${batch.requestedAt}`}
        action={<StatusBadge status={status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Rincian routing</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                Berat ditawarkan
              </dt>
              <dd className="mt-1 text-xl font-semibold">
                {formatKg(batch.offeredWeightGrams)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pickup</dt>
              <dd className="mt-1 text-sm font-semibold">
                {batch.pickupWindow}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Jarak</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4 text-primary" />
                {batch.distanceKm.toLocaleString("id-ID")} km
              </dd>
            </div>
          </dl>
          <div className="mt-6 rounded-xl bg-secondary p-4">
            <p className="text-sm font-semibold">Urutan wajib</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Terima routing → timbang intake → catat outcome. Setiap langkah
              tetap terpisah agar material dapat ditelusuri.
            </p>
          </div>
        </section>

        <aside className="rounded-xl bg-secondary p-5">
          {step === "review" ? (
            <div>
              <ClipboardCheck className="size-8 text-primary" />
              <h2 className="mt-4 font-semibold">Tinjau permintaan</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pastikan material, jarak, pickup window, dan kapasitas fasilitas
                sesuai sebelum menerima.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("declined");
                    toast.info("Permintaan ditolak dalam mode demo.");
                  }}
                >
                  <XCircle /> Tolak
                </Button>
                <Button
                  onClick={() => {
                    setStep("intake");
                    toast.success("Permintaan diterima dalam mode demo.");
                  }}
                >
                  <CheckCircle2 /> Terima
                </Button>
              </div>
            </div>
          ) : null}

          {step === "intake" ? (
            <form onSubmit={submitIntake}>
              <Scale className="size-7 text-primary" />
              <h2 className="mt-4 font-semibold">Catat intake</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Timbang ulang saat batch tiba di fasilitas.
              </p>
              <div className="mt-5 space-y-2">
                <Label htmlFor="measured-weight">Berat terukur (gram)</Label>
                <Input
                  id="measured-weight"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={measured}
                  onChange={(event) => setMeasured(event.target.value)}
                  placeholder="Contoh: 7900"
                />
              </div>
              <Button type="submit" className="mt-5 w-full">
                Validasi intake
              </Button>
            </form>
          ) : null}

          {step === "outcome" ? (
            <form onSubmit={submitOutcome}>
              <ClipboardCheck className="size-8 text-primary" />
              <h2 className="mt-4 font-semibold">Catat outcome</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Total outcome tidak boleh melebihi {formatKg(Number(measured))}.
                Selisih akan dilaporkan sebagai moisture loss atau belum
                teratribusi.
              </p>
              <div className="mt-5 space-y-2">
                <Label htmlFor="outcome-type">Outcome utama</Label>
                <select
                  id="outcome-type"
                  value={outcome}
                  onChange={(event) =>
                    setOutcome(event.target.value as Outcome)
                  }
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="compost">Kompos</option>
                  <option value="bsf_larvae">Larva BSF</option>
                  <option value="animal_feed">Pakan ternak</option>
                  <option value="biogas">Biogas</option>
                </select>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="output-weight">Terolah (gram)</Label>
                  <Input
                    id="output-weight"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={outputWeight}
                    onChange={(event) => setOutputWeight(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residual-weight">Residu (gram)</Label>
                  <Input
                    id="residual-weight"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={residualWeight}
                    onChange={(event) => setResidualWeight(event.target.value)}
                  />
                </div>
              </div>
              {outputWeight !== "" && residualWeight !== "" ? (
                <p className="mt-3 rounded-lg bg-background/70 p-3 text-xs text-muted-foreground">
                  Selisih proses:{" "}
                  {formatKg(
                    Math.max(
                      0,
                      Number(measured) -
                        Number(outputWeight) -
                        Number(residualWeight),
                    ),
                  )}
                </p>
              ) : null}
              {Number(residualWeight) === 0 && residualWeight !== "" ? (
                <label className="mt-3 flex min-h-11 items-center gap-3 rounded-lg border bg-background p-3 text-xs leading-relaxed">
                  <input
                    type="checkbox"
                    checked={zeroResidualConfirmed}
                    onChange={(event) =>
                      setZeroResidualConfirmed(event.target.checked)
                    }
                    className="size-4 accent-primary"
                  />
                  Saya memastikan hasil penimbangan menunjukkan Residu 0 gram.
                </label>
              ) : null}
              <Button type="submit" className="mt-5 w-full">
                Simpan outcome demo
              </Button>
            </form>
          ) : null}

          {step === "processed" ? (
            <div>
              <CheckCircle2 className="size-8 text-primary" />
              <h2 className="mt-4 font-semibold">Batch sudah terolah</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Outcome demo: {outcomeLabels[outcome]}. Event PROCESSED membawa
                berat terolah dan Residu di metadata.
              </p>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() =>
                  toast.info("Detail ledger akan aktif setelah M1 dan M5.")
                }
              >
                Lihat jejak material
              </Button>
            </div>
          ) : null}

          {step === "declined" ? (
            <div>
              <XCircle className="size-8 text-destructive" />
              <h2 className="mt-4 font-semibold">Penawaran dikembalikan</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Batch kembali ke status menunggu agar Circular Routing dapat
                menawarkan ke processor berikutnya.
              </p>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => setStep("review")}
              >
                Ulangi demo
              </Button>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
