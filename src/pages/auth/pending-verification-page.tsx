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
      "Perbarui profil sesuai alasan Admin, lalu ajukan kembali untuk ditinjau.",
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

  // An unmapped status must still render a page rather than crash the shell.
  const config =
    statusConfig[verificationStatus as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = config.icon;

  /**
   * Both rejection and suspension record the Admin's reason on the profile, and
   * the owner is the person who has to act on it — showing the generic copy
   * instead would hide the one sentence that tells them what to fix.
   */
  const adminReason =
    (verificationStatus === "rejected" || verificationStatus === "suspended") &&
    profile?.rejectionReason
      ? profile.rejectionReason
      : null;

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
      {adminReason ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-left">
          <p className="text-sm font-semibold">Alasan dari Admin</p>
          <p className="mt-1 text-sm text-muted-foreground">{adminReason}</p>
        </div>
      ) : null}

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
        {verificationStatus === "rejected" ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate(`/${user.role}/onboarding`)}
          >
            Perbarui profil dan ajukan kembali
          </Button>
        ) : null}
        <Button
          size={verificationStatus === "rejected" ? "default" : "lg"}
          variant={verificationStatus === "rejected" ? "outline" : "default"}
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
