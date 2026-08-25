import { Clock, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

const statusConfig = {
  pending: {
    icon: Clock,
    title: "Menunggu verifikasi",
    description:
      "Profil Anda sedang ditinjau oleh tim admin. Proses verifikasi biasanya memerlukan waktu 1–2 hari kerja.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  rejected: {
    icon: ShieldX,
    title: "Verifikasi ditolak",
    description:
      "Profil Anda tidak lolos verifikasi. Silakan hubungi tim support untuk informasi lebih lanjut.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  suspended: {
    icon: AlertTriangle,
    title: "Akun ditangguhkan",
    description:
      "Akun Anda saat ini ditangguhkan. Silakan hubungi tim support.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
} as const;

export default function PendingVerificationPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Determine verification status from profile
  const profile = user?.profile;
  let verificationStatus: "pending" | "rejected" | "suspended" = "pending";

  if (
    profile &&
    (profile.kind === "merchant" || profile.kind === "processor") &&
    profile.verificationStatus !== "verified"
  ) {
    verificationStatus = profile.verificationStatus;
  }

  const config = statusConfig[verificationStatus];
  const Icon = config.icon;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <div
        className={`grid size-14 place-items-center rounded-2xl ${config.bgColor}`}
      >
        <Icon className={`size-7 ${config.color}`} />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em]">
        {config.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {config.description}
      </p>

      {user && (
        <div className="mt-8 rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Masuk sebagai</p>
          <p className="mt-1 font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-2 text-xs capitalize text-muted-foreground">
            Peran: {user.role}
          </p>
        </div>
      )}

      {verificationStatus === "pending" && (
        <div className="mt-6 rounded-xl bg-secondary p-4">
          <p className="flex gap-3 text-sm">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <span>
              <strong className="block">Apa selanjutnya?</strong>
              <span className="text-muted-foreground">
                Anda akan menerima notifikasi setelah admin menyelesaikan
                peninjauan. Sementara itu, Anda tetap dapat menjelajah sebagai
                consumer.
              </span>
            </span>
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Button size="lg" className="w-full" onClick={() => navigate("/")}>
          Jelajah sebagai Consumer
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={handleLogout}
        >
          Keluar
        </Button>
      </div>
    </>
  );
}
