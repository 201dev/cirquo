import { Info, Leaf, Scale, WalletCards } from "lucide-react";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { SummaryCard } from "@/components/common/summary-card";
import { Badge } from "@/components/ui/badge";
import { demoImpact } from "@/constants/mock-data";

export default function ImpactPage() {
  return (
    <>
      <PageHeader
        title="Dampakmu"
        description="Ringkasan ilustratif dari makanan yang kamu pickup. Data produksi nantinya hanya dihitung dari Material Flow Ledger."
        action={<Badge variant="outline">Data demo</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Terselamatkan"
          value="2,4 kg"
          description="Dari 5 pickup selesai"
          icon={<Scale />}
          tone="green"
        />
        <SummaryCard
          label="Hemat"
          value="Rp84.000"
          description="Dibanding harga awal"
          icon={<WalletCards />}
        />
        <SummaryCard
          label="Estimasi CO2e"
          value="5,8 kg"
          description="Ilustrasi metode impact-v1"
          icon={<Leaf />}
          tone="blue"
        />
      </div>
      <div className="mt-6">
        <ImpactBreakdown {...demoImpact} />
      </div>
      <section className="mt-8 grid gap-6 border-t pt-8 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">
            Dampak yang bisa ditelusuri.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Cirquo tidak menyembunyikan Residu dan tidak mengklaim 100%
            circular. Aliran makanan akan terlihat sampai outcome terakhirnya.
          </p>
        </div>
        <div className="rounded-xl bg-muted p-5">
          <p className="flex gap-3 text-sm leading-relaxed">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <strong className="block">Tentang estimasi</strong>
              <span className="text-muted-foreground">
                Angka CO2e pada layar ini adalah contoh desain, bukan hasil
                pengukuran. Integrasi metodologi dan ledger direncanakan pada
                milestone M6.
              </span>
            </span>
          </p>
        </div>
      </section>
    </>
  );
}
