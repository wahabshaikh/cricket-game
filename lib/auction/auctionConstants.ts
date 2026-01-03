// Constants for IPL Mega Auction

// Initial purse for each team (in lakhs for easier calculation)
export const INITIAL_PURSE = 12000; // 120 Crore = 12000 Lakhs

// Squad constraints
export const MIN_SQUAD_SIZE = 18;
export const MAX_SQUAD_SIZE = 25;
export const MAX_OVERSEAS = 8;

// Role requirements (min/max)
export const SQUAD_REQUIREMENTS = {
  BAT: { min: 4, max: 6 },
  WK: { min: 2, max: 3 },
  AR: { min: 3, max: 5 },
  BOWL: { min: 5, max: 7 },
} as const;

// Base price tiers (in lakhs)
export const PRICE_TIERS = {
  MARQUEE: 200,    // 2 Crore
  TIER_2: 150,     // 1.5 Crore
  TIER_3: 100,     // 1 Crore
  TIER_4: 75,      // 75 Lakhs
  TIER_5: 50,      // 50 Lakhs
} as const;

// Bidding increment rules (all in lakhs)
export const BID_INCREMENTS = [
  { threshold: 100, increment: 5 },   // Up to 1 Cr: 5L increment
  { threshold: 200, increment: 10 },  // 1-2 Cr: 10L increment
  { threshold: Infinity, increment: 25 }, // 2 Cr+: 25L increment
] as const;

// Team personalities for AI bidding behavior
export const TEAM_PERSONALITIES: Record<string, 'aggressive' | 'conservative' | 'balanced'> = {
  CHE: 'conservative',
  MUM: 'aggressive',
  KOL: 'balanced',
  BLR: 'aggressive',
  HYD: 'balanced',
  DEL: 'aggressive',
  RAJ: 'conservative',
  PUN: 'aggressive',
  LKN: 'balanced',
  GUJ: 'conservative',
};

// Auction timing (ms)
export const BID_TIMER = 5000; // 5 seconds between bids
export const SOLD_DELAY = 2000; // 2 seconds after "SOLD"

// Format helpers
export const formatPrice = (lakhs: number): string => {
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    return `₹${crores.toFixed(crores % 1 === 0 ? 0 : 2)} Cr`;
  }
  return `₹${lakhs} L`;
};

export const formatPriceShort = (lakhs: number): string => {
  if (lakhs >= 100) {
    return `${(lakhs / 100).toFixed(1)}Cr`;
  }
  return `${lakhs}L`;
};
