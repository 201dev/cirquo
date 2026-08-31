import type { UserRole } from "@/types/domain";

/**
 * Where each role lands after signing in. Consumers get the homepage rather than
 * the search surface: arriving straight in a filter form asks them what they want
 * before showing them what is there.
 */
const roleHomes: Record<UserRole, string> = {
  consumer: "/home",
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
