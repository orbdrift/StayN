export const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

export function priceBreakdown(nightlyRate, nights, cleaningFee, serviceFeePercent = 10) {
  const subtotal = nightlyRate * nights;
  const serviceFee = Math.round((subtotal * serviceFeePercent) / 100);
  return { nightlyRate, nights, subtotal, cleaningFee, serviceFee, total: subtotal + cleaningFee + serviceFee };
}
