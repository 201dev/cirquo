import { MoreHorizontal, Plus } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";

const formatIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

const pickupDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

const pickupTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatPickupWindow(startAt: number, endAt: number) {
  return `${pickupDateFormatter.format(new Date(startAt))}, ${pickupTimeFormatter.format(new Date(startAt))}–${pickupTimeFormatter.format(new Date(endAt))}`;
}

class MerchantListErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="rounded-xl border border-destructive/30 p-5">
          <p className="font-medium">Daftar Rescue Item tidak dapat dimuat.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Periksa koneksi lalu coba lagi.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Coba lagi
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function MerchantSurplusList() {
  const { sessionToken } = useAuth();
  const merchantItems = useQuery(
    api.surplusItems.listMine,
    sessionToken ? { sessionToken } : "skip",
  );

  if (merchantItems === undefined) {
    return (
      <div role="status" className="space-y-3 rounded-xl bg-card p-4">
        <span className="sr-only">Memuat daftar Rescue Item...</span>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (merchantItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
        <p className="text-sm font-medium text-foreground">
          Belum ada Rescue Item
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat Rescue Item pertamamu untuk mulai menyelamatkan surplus.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/merchant/surplus/new">
            <Plus className="mr-2 size-4" />
            Buat Rescue Item
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)]">
      <Table className="min-w-[44rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Rescue Item</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchantItems.map((item) => (
            <TableRow key={item._id}>
              <TableCell>
                <p className="font-medium">{item.name}</p>
                {item.processingOnly ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Khusus Organic Processor
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-sm">
                {formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}
              </TableCell>
              <TableCell>
                <p>{formatIdr(item.currentPrice)}</p>
                <s className="text-xs text-muted-foreground">
                  {formatIdr(item.originalPrice)}
                </s>
              </TableCell>
              <TableCell>
                {item.remainingQuantity} / {item.initialQuantity}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  aria-label={`Buka ${item.name}`}
                >
                  <Link to={`/merchant/surplus/${item._id}`}>
                    <MoreHorizontal />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MerchantSurplusPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Rescue Item"
        description={`Kelola surplus yang masuk ke alur circular ${user?.name || "merchant"}.`}
        action={
          <Button asChild>
            <Link to="/merchant/surplus/new">
              <Plus />
              Buat Rescue Item
            </Link>
          </Button>
        }
      />
      <MerchantListErrorBoundary>
        <MerchantSurplusList />
      </MerchantListErrorBoundary>
    </>
  );
}
