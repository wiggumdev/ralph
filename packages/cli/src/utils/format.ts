/**
 * Formats token count for display.
 * Numbers >= 1000 are shown with 'k' suffix (e.g., "1.5k").
 */
export function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Formats cost in USD for display.
 * Costs < $0.01 show 4 decimals, otherwise 2 decimals.
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
