/**
 * Apply a percentage discount to a price.
 *
 * Example: applyDiscount(100, 20) should return 80 (20% off 100).
 *
 * 🐞 BUG A (fix me in the `fix/pricing-bug` worktree):
 * This multiplies the price by the raw percent instead of subtracting the
 * discount. applyDiscount(100, 20) currently returns 2000, not 80.
 */
export function applyDiscount(price: number, percentOff: number) {
  return price * percentOff;
}
