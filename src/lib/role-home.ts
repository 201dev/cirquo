import type { UserRole } from "@/types/domain";

const roleHomes: Record<UserRole, string> = {
  consumer: "/discover",
  merchant: "/merchant",
  processor: "/processor",
  admin: "/admin",
};

export function homeForRole(role: UserRole) {
  return roleHomes[role];
}

export function safeReturnTo(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
