export function inr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function timeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
