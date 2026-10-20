export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

export function formatDate(value: string) {
  if (!value) return "-";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function nextSequentialCode(existing: string[], prefix: string) {
  let max = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  for (const code of existing) {
    const match = code.trim().match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function errorMessage(err: unknown) {
  if (typeof err === "object" && err && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan";
}

export function explainError(message: string) {
  if (/row-level security/i.test(message)) {
    return "Penyimpanan ditolak Row Level Security. Buka SQL Editor Supabase, jalankan isi file supabase/setup.sql, lalu coba lagi.";
  }
  return message;
}

export function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function kekurangan(order: number, datang: number) {
  return Math.max(0, toNumber(order) - toNumber(datang));
}
