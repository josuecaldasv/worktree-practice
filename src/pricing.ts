/**
 * Apply a percentage discount to a price.
 *
 * Example: applyDiscount(100, 20) returns 80 (20% off 100).
 */
export function applyDiscount(price: number, percentOff: number) {
  return price * (1 - percentOff / 100);
}
