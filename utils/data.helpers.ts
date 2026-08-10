// switch (Module 3)
export function transactionLabel(type: 'payment' | 'request'): string {
  switch (type) {
    case 'payment':
      return 'paid';
    case 'request':
      return 'requested';
  }
}

// else if chain (Module 3)
export function categorizeAmount(amount: number): 'micro' | 'small' | 'medium' | 'large' {
  if (amount < 10) return 'micro';
  else if (amount < 100) return 'small';
  else if (amount < 1000) return 'medium';
  else return 'large';
}

// for...in (Module 3)
export function objectFieldTypes(obj: Record<string, unknown>): Record<string, string> {
  const types: Record<string, string> = {};
  for (const key in obj) {
    types[key] = typeof obj[key];
  }
  return types;
}

// while loop (Module 3)
export async function pollUntil(
  check: () => Promise<boolean>,
  maxAttempts = 10,
  delayMs = 500,
): Promise<boolean> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, delayMs));
    attempt++;
  }
  return false;
}

// .reduce() (Module 5)
export function totalAmounts(amounts: number[]): number {
  return amounts.reduce((sum, n) => sum + n, 0);
}

// .map() (Module 5)
export function formatCurrency(amounts: number[]): string[] {
  return amounts.map((a) => `$${a.toFixed(2)}`);
}

// Array destructuring (Module 5)
export function splitFullName(fullName: string): { first: string; last: string } {
  const [first, ...rest] = fullName.split(' ');
  return { first, last: rest.join(' ') };
}
