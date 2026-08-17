import { MoreHorizontal, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIdr, rescueItems } from "@/constants/mock-data";

export default function MerchantSurplusPage() {
  const merchantItems = rescueItems.filter(
    (item) => item.merchantName === "Roti Tembalang",
  );

  return (
    <>
      <PageHeader
        title="Rescue Item"
        description="Kelola surplus yang masuk ke alur circular Roti Tembalang."
        action={
          <Button asChild>
            <Link to="/merchant/surplus/new">
              <Plus />
              Buat baru
            </Link>
          </Button>
        }
      />
      <div className="hidden overflow-hidden rounded-xl bg-card shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)] md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rescue Item</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Aksi</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt=""
                      className="size-11 rounded-md object-cover"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.weightPerItemGrams} gram / unit
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{item.pickupWindow}</TableCell>
                <TableCell>{formatIdr(item.currentPrice)}</TableCell>
                <TableCell>{item.remainingQuantity}</TableCell>
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
                    <Link to={`/merchant/surplus/${item.id}`}>
                      <MoreHorizontal />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {merchantItems.map((item) => (
          <Link
            key={item.id}
            to={`/merchant/surplus/${item.id}`}
            className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-xl bg-card p-3 shadow-sm"
          >
            <img
              src={item.image}
              alt=""
              className="aspect-square size-full rounded-lg object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium">{item.name}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.pickupWindow}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatIdr(item.currentPrice)} · {item.remainingQuantity} sisa
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
