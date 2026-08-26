import type { UserRole } from "@/types/domain";

const roleHomes: Record<UserRole, string> = {
  consumer: "/",
  merchant: "/merchant",
  processor: "/processor",
  admin: "/admin",
};

export function homeForRole(role: UserRole) {
  return roleHomes[role];
}
