/**
 * Normalize Pakistani (and common international) phone numbers to OpenWA chat IDs.
 * Example: 03335789091 → 923335789091@c.us
 */
export function toWhatsAppChatId(rawPhone: string): string {
  const trimmed = String(rawPhone ?? "").trim();
  if (!trimmed) {
    throw new Error("Phone number is required");
  }

  if (trimmed.includes("@")) {
    return trimmed;
  }

  let digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Local Pakistani mobile: 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }

  // 10-digit national number without leading 0 (e.g. 3335789091)
  if (!digits.startsWith("92") && digits.length === 10) {
    digits = `92${digits}`;
  }

  if (digits.length < 10) {
    throw new Error(`Invalid phone number: ${rawPhone}`);
  }

  return `${digits}@c.us`;
}

/** Display-friendly E.164-ish digits without @c.us suffix. */
export function normalizePhoneDigits(rawPhone: string): string {
  const chatId = toWhatsAppChatId(rawPhone);
  return chatId.replace(/@c\.us$/i, "").replace(/@g\.us$/i, "");
}
