import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { MerchantImpactSummary } from "@/components/common/merchant-impact-summary";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function MerchantDashboardPage() {
  const { user } = useAuth();
  const merchantName = user?.profile?.type === "merchant" ? user.profile.name : "Merchant";

  return (
    <>
      <PageHeader
        title={`Ringkasan ${merchantName}`}
        description="Lacak setiap Rescue Item dari material tercatat hingga pickup atau outcome pengolahan."
        action={
          <Button asChild>
            <Link to="/merchant/surplus/new"><Plus />Buat Rescue Item</Link>
          </Button>
        }
      />
      <QueryErrorBoundary title="Dampak Merchant tidak dapat dimuat">
        <MerchantImpactSummary />
      </QueryErrorBoundary>
    </>
  );
}
