import { CheckCircle2, KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PickupPage() {
  const [code, setCode] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!/^CQ-\d{4}$/.test(normalizedCode))
      return toast.error("Gunakan format kode CQ-0000.");
    if (normalizedCode !== "CQ-4821")
      return toast.error("Kode tidak cocok dengan pesanan demo aktif.");
    toast.success(
      "Kode valid dalam mode demo. Konfirmasi server akan dibangun pada M4.",
    );
  }
  return (
    <>
      <PageHeader
        title="Konfirmasi pickup"
        description="Masukkan kode yang ditunjukkan konsumen saat mereka tiba di merchant."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={submit} className="rounded-xl bg-card p-6 shadow-sm">
          <label htmlFor="pickup-code" className="text-sm font-medium">
            Kode pickup
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              id="pickup-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="font-mono text-lg tracking-widest"
              placeholder="CQ-0000"
              autoComplete="off"
            />
            <Button type="submit">
              <KeyRound />
              Periksa
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Coba kode demo CQ-4821. Tidak ada data yang akan berubah.
          </p>
        </form>
        <aside className="rounded-xl bg-secondary p-5">
          <CheckCircle2 className="size-8 text-primary" />
          <h2 className="mt-4 font-semibold">
            Satu konfirmasi, satu ledger event
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Saat backend aktif, status pesanan dan event RESCUED harus ditulis
            dalam transaksi yang sama.
          </p>
        </aside>
      </div>
    </>
  );
}
