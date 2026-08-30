/**
 * Presentation rules for Admin account review. Kept free of React and Convex so
 * the reason limits the server enforces can be asserted in a plain test — the
 * dialog and the mutation must agree, or an Admin types 500 characters and only
 * finds out after submitting.
 */

export const REVIEW_REASON_MIN = 10;
export const REVIEW_REASON_MAX = 500;
export const VERIFICATION_NOTE_MAX = 500;

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  bakery: "Toko roti",
  restaurant: "Restoran",
  cafe: "Kafe",
  grocery: "Toko bahan pangan",
  catering: "Katering",
  warung: "Warung",
  other: "Mitra Usaha",
};

export const FACILITY_TYPE_LABELS: Record<string, string> = {
  bsf_farm: "Peternakan BSF",
  composting: "Pengomposan",
  biogas: "Biogas",
  animal_feed: "Pakan ternak",
};

/**
 * What kind of partner this row is, in words an Admin can act on. Falls back to
 * the plain role when the profile predates the typed fields, rather than
 * inventing a facility type nobody entered.
 */
export function partnerTypeLabel(partner: {
  kind: "merchant" | "processor";
  businessType: string | null;
  facilityType: string | null;
}): string {
  if (partner.kind === "merchant") {
    const label = partner.businessType
      ? BUSINESS_TYPE_LABELS[partner.businessType]
      : undefined;
    return label ? `Merchant · ${label}` : "Merchant";
  }
  const label = partner.facilityType
    ? FACILITY_TYPE_LABELS[partner.facilityType]
    : undefined;
  return label ? `Organic Processor · ${label}` : "Organic Processor";
}

/**
 * Validation message for a mandatory review reason, or `null` when it passes.
 * Mirrors the server's 10–500 rule on the trimmed value, because trailing
 * whitespace must not be allowed to buy an Admin the tenth character.
 */
export function reviewReasonError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Alasan wajib diisi.";
  if (trimmed.length < REVIEW_REASON_MIN) {
    return `Alasan terlalu singkat: ${trimmed.length} dari minimal ${REVIEW_REASON_MIN} karakter.`;
  }
  if (trimmed.length > REVIEW_REASON_MAX) {
    return `Alasan terlalu panjang: ${trimmed.length} dari maksimal ${REVIEW_REASON_MAX} karakter.`;
  }
  return null;
}

/** Optional verification note: empty is fine, over-long is not. */
export function verificationNoteError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length > VERIFICATION_NOTE_MAX) {
    return `Catatan terlalu panjang: ${trimmed.length} dari maksimal ${VERIFICATION_NOTE_MAX} karakter.`;
  }
  return null;
}

/**
 * How long an application has been waiting, coarse on purpose: an Admin decides
 * on "sudah 3 hari", not on seconds. Never negative — a profile whose clock is
 * ahead of ours reads as "baru saja" instead of a future duration.
 */
export function formatWaitingTime(sinceMs: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - sinceMs) / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;

  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours === 0 ? `${days} hari` : `${days} hari ${remainderHours} jam`;
}
