import { Leaf, PackageCheck, Scale } from "lucide-react";
import { ImpactBreakdown } from "@/components/common/impact-breakdown";
import { PageHeader } from "@/components/common/page-header";
import { SummaryCard } from "@/components/common/summary-card";
import { demoImpact } from "@/constants/mock-data";

export default function MerchantImpactPage() {
  return (
    <>
      <PageHeader
        title="Dampak merchant"
        description="Pratinjau ringkasan Roti Tembalang. Angka produksi nantinya diturunkan dari Material Flow Ledger."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Paket terselamatkan"
          value="41"
          icon={<PackageCheck />}
          tone="green"
        />
        <SummaryCard label="Pangan tercatat" value="23,7 kg" icon={<Scale />} />
        <SummaryCard
          label="Estimasi CO2e"
          value="48,2 kg"
          description="Data demo · impact-v1"
          icon={<Leaf />}
          tone="blue"
        />
      </div>
      <div className="mt-6">
        <ImpactBreakdown {...demoImpact} />
      </div>
    </>
  );
}
