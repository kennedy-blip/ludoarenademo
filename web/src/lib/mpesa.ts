/** M-Pesa helpers shared by the UI. Actual Daraja calls live server-side. */

export const DARAJA_SANDBOX = "https://sandbox.safaricom.co.ke";
export const DARAJA_PRODUCTION = "https://api.safaricom.co.ke";

/** Normalise to 2547XXXXXXXX / 2541XXXXXXXX. */
export function formatKenyanPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `254${digits.slice(1)}`;
  else if (digits.startsWith("7") || digits.startsWith("1")) digits = `254${digits}`;
  else if (digits.startsWith("2540")) digits = `254${digits.slice(4)}`;
  return digits;
}

export function validateKenyanPhone(input: string): boolean {
  const normalised = formatKenyanPhone(input);
  return /^254(7|1)\d{8}$/.test(normalised);
}

export function maskPhone(input: string): string {
  const n = formatKenyanPhone(input);
  if (n.length < 6) return n;
  return `${n.slice(0, 6)}***${n.slice(-2)}`;
}

export type MpesaMode = "demo" | "live";

export function mpesaMode(): MpesaMode {
  return process.env.MPESA_MODE === "live" ? "live" : "demo";
}

/** Daraja password = base64(shortcode + passkey + timestamp). */
export function stkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

export function darajaTimestamp(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
