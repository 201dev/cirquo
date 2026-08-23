import {
  Check,
  FileWarning,
  MessageSquareWarning,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";

type QueueType = "verifications" | "moderation" | "disputes";
const content = {
  verifications: {
    title: "Verifikasi mitra",
    description:
      "Tinjau identitas usaha sebelum merchant atau Organic Processor diaktifkan.",
    icon: ShieldCheck,
    items: [
      {
        name: "Dapur Berkah Tembalang",
        meta: "Merchant · NIB diunggah 2 jam lalu",
        status: "Menunggu",
      },
      {
        name: "BioCycle Jateng",
        meta: "Organic Processor · Dokumen fasilitas lengkap",
        status: "Menunggu",
      },
      {
        name: "Panen Tetangga",
        meta: "Merchant · NIB perlu pemeriksaan",
        status: "Perlu tinjauan",
      },
    ],
  },
  moderation: {
    title: "Moderasi Rescue Item",
    description: "Tinjau konten yang ditandai pengguna atau sistem.",
    icon: FileWarning,
    items: [
      {
        name: "Paket minuman kemasan",
        meta: "Ditandai: deskripsi tidak sesuai",
        status: "Menunggu",
      },
      {
        name: "Roti kemarin premium",
        meta: "Ditandai: pickup window berakhir",
        status: "Perlu tinjauan",
      },
    ],
  },
  disputes: {
    title: "Sengketa",
    description:
      "Tangani masalah pickup dan pembayaran dengan jejak yang dapat ditelusuri.",
    icon: MessageSquareWarning,
    items: [
      {
        name: "DSP-2026-0817-01",
        meta: "Kode pickup tidak dikenali · Roti Tembalang",
        status: "Baru",
      },
      {
        name: "DSP-2026-0815-04",
        meta: "Merchant tutup saat pickup window",
        status: "Ditinjau",
      },
    ],
  },
} satisfies Record<
  QueueType,
  {
    title: string;
    description: string;
    icon: typeof ShieldCheck;
    items: { name: string; meta: string; status: string }[];
  }
>;

export default function ReviewQueuePage({ type }: { type: QueueType }) {
  const page = content[type];
  const Icon = page.icon;
  return (
    <>
      <PageHeader title={page.title} description={page.description} />
      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="divide-y">
          {page.items.map((item) => (
            <article
              key={item.name}
              className="flex flex-wrap items-center gap-4 p-4"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-52 flex-1">
                <h2 className="text-sm font-semibold">{item.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.meta}
                </p>
              </div>
              <StatusBadge status={item.status} />
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Tolak ${item.name}`}
                  onClick={() =>
                    toast.info("Aksi penolakan masih berupa demo frontend.")
                  }
                >
                  <X />
                </Button>
                <Button
                  size="icon"
                  aria-label={`Setujui ${item.name}`}
                  onClick={() =>
                    toast.success(
                      "Aksi persetujuan masih berupa demo frontend.",
                    )
                  }
                >
                  <Check />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
