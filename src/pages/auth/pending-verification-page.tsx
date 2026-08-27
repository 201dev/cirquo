import { Clock, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { homeForRole } from "@/lib/role-home";

const statusConfig = {
  pending: {
    icon: Clock,
    title: "Menunggu verifikasi",
    description:
      "Profil Anda sudah dikirim dan sedang menunggu peninjauan dari tim admin.",
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
  const location = useLocation();

  const profile = user?.profile;
  const submitted = Boolean(
    (location.state as { profileSubmitted?: boolean } | null)?.profileSubmitted,
  );

  if (!user || (user.role !== "merchant" && user.role !== "processor")) {
    return <Navigate to="/auth/continue" replace />;
  }
  if (!profile && !submitted) {
    return <Navigate to={`/${user.role}/onboarding`} replace />;
  }
  if (profile?.verificationStatus === "verified") {
    return <Navigate to="/auth/continue" replace />;
  }

  const verificationStatus = profile?.verificationStatus ?? "pending";

  const config = statusConfig[verificationStatus];
  const Icon = config.icon;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
                Status di halaman ini akan diperbarui setelah admin menyelesaikan
                peninjauan. Sementara itu, Anda tetap dapat menjelajah sebagai
                Consumer.
              </span>
            </span>
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(homeForRole(user.role))}
        >
          Kembali ke ringkasan
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
