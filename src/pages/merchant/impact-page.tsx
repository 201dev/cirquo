import { MerchantImpactSummary } from "@/components/common/merchant-impact-summary";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";

export default function MerchantImpactPage() {
  return (
    <>
      <PageHeader
        title="Dampak Merchant"
        description="Bukti material Rescue Item milikmu, dihitung reaktif dari Material Flow Ledger."
      />
      <QueryErrorBoundary title="Dampak Merchant tidak dapat dimuat">
        <MerchantImpactSummary />
      </QueryErrorBoundary>
    </>
  );
}
