// AI Bidding Strategy for IPL Mega Auction

import { Player, Team, TeamNeeds, TeamPersonality } from './auctionTypes';
import {
  SQUAD_REQUIREMENTS,
  MAX_OVERSEAS,
  MIN_SQUAD_SIZE,
  MAX_SQUAD_SIZE,
  TEAM_PERSONALITIES,
  BID_INCREMENTS,
} from './auctionConstants';

// Calculate remaining needs for a team
export function calculateTeamNeeds(team: Team): TeamNeeds {
  const counts = { BAT: 0, WK: 0, AR: 0, BOWL: 0, overseas: 0 };
  
  team.players.forEach(p => {
    counts[p.role]++;
    if (p.nationality !== 'India') counts.overseas++;
  });

  return {
    batters: Math.max(0, SQUAD_REQUIREMENTS.BAT.min - counts.BAT),
    wicketkeepers: Math.max(0, SQUAD_REQUIREMENTS.WK.min - counts.WK),
    allrounders: Math.max(0, SQUAD_REQUIREMENTS.AR.min - counts.AR),
    bowlers: Math.max(0, SQUAD_REQUIREMENTS.BOWL.min - counts.BOWL),
    overseas: MAX_OVERSEAS - counts.overseas,
    total: MIN_SQUAD_SIZE - team.players.length,
  };
}

// Get current count of each role
function getRoleCounts(team: Team): Record<string, number> {
  const counts: Record<string, number> = { BAT: 0, WK: 0, AR: 0, BOWL: 0 };
  team.players.forEach(p => counts[p.role]++);
  return counts;
}

// Check if team can bid (has slots and purse)
export function canTeamBid(team: Team, currentBid: number): boolean {
  const slotsRemaining = MAX_SQUAD_SIZE - team.players.length;
  const minPurseNeeded = (MIN_SQUAD_SIZE - team.players.length - 1) * 50; // 50L minimum per player
  const availablePurse = team.purse - minPurseNeeded;
  
  return slotsRemaining > 0 && availablePurse > currentBid;
}

// Check if team needs this player role
function needsRole(team: Team, role: string): { needed: boolean; urgency: number } {
  const counts = getRoleCounts(team);
  const current = counts[role] || 0;
  const req = SQUAD_REQUIREMENTS[role as keyof typeof SQUAD_REQUIREMENTS];
  
  if (current < req.min) {
    return { needed: true, urgency: 1 - (current / req.min) };
  }
  if (current < req.max) {
    return { needed: true, urgency: 0.3 };
  }
  return { needed: false, urgency: 0 };
}

// Check overseas slot availability
function checkOverseasSlot(team: Team, player: Player): boolean {
  if (player.nationality === 'India') return true;
  
  const overseasCount = team.players.filter(p => p.nationality !== 'India').length;
  return overseasCount < MAX_OVERSEAS;
}

// Calculate player value score (0-100)
function calculatePlayerValue(player: Player): number {
  const weights = {
    BAT: { batting: 0.7, bowling: 0.1, fielding: 0.2 },
    WK: { batting: 0.5, bowling: 0.1, fielding: 0.4 },
    AR: { batting: 0.4, bowling: 0.4, fielding: 0.2 },
    BOWL: { batting: 0.1, bowling: 0.7, fielding: 0.2 },
  };
  
  const w = weights[player.role];
  return player.batting * w.batting + player.bowling * w.bowling + player.fielding * w.fielding;
}

// Calculate maximum bid for a player
export function calculateMaxBid(
  team: Team,
  player: Player,
  personality: TeamPersonality
): number {
  // Check constraints first
  if (!checkOverseasSlot(team, player)) return 0;
  if (team.players.length >= MAX_SQUAD_SIZE) return 0;
  
  const { needed, urgency } = needsRole(team, player.role);
  if (!needed && team.players.length >= MIN_SQUAD_SIZE) return 0;
  
  const playerValue = calculatePlayerValue(player);
  const slotsLeft = MAX_SQUAD_SIZE - team.players.length;
  const averageBudgetPerSlot = team.purse / Math.max(slotsLeft, 1);
  
  // Base max bid calculation
  let maxBid = (playerValue / 100) * averageBudgetPerSlot * (1 + urgency);
  
  // Personality modifiers
  const personalityMultipliers = {
    aggressive: 1.3,
    balanced: 1.0,
    conservative: 0.75,
  };
  maxBid *= personalityMultipliers[personality];
  
  // Don't bid more than available purse (keeping minimum for remaining slots)
  const minReserve = (MIN_SQUAD_SIZE - team.players.length - 1) * 50;
  maxBid = Math.min(maxBid, team.purse - minReserve);
  
  // Minimum bid is base price
  maxBid = Math.max(maxBid, player.basePrice);
  
  return Math.floor(maxBid);
}

// Decide if AI should bid
export function shouldAIBid(
  team: Team,
  player: Player,
  currentBid: number,
  currentBidder: string | null
): { shouldBid: boolean; bidAmount: number } {
  // Skip if already winning
  if (currentBidder === team.id) {
    return { shouldBid: false, bidAmount: 0 };
  }
  
  // Check if team can bid
  if (!canTeamBid(team, currentBid)) {
    return { shouldBid: false, bidAmount: 0 };
  }
  
  const personality = TEAM_PERSONALITIES[team.id] || 'balanced';
  const maxBid = calculateMaxBid(team, player, personality);
  
  // Determine bid increment
  let increment = 5;
  for (const rule of BID_INCREMENTS) {
    if (currentBid < rule.threshold) {
      increment = rule.increment;
      break;
    }
  }
  
  const nextBid = currentBid + increment;
  
  // Check if we want to bid
  if (nextBid > maxBid) {
    return { shouldBid: false, bidAmount: 0 };
  }
  
  // Calculate bid probability based on how far we are from max
  const bidRatio = nextBid / maxBid;
  let bidProbability = 1 - Math.pow(bidRatio, 2);
  
  // Personality affects probability
  if (personality === 'aggressive') bidProbability += 0.2;
  if (personality === 'conservative') bidProbability -= 0.1;
  
  // Urgency affects probability
  const { urgency } = needsRole(team, player.role);
  bidProbability += urgency * 0.3;
  
  // Random check
  const shouldBid = Math.random() < bidProbability;
  
  return { shouldBid, bidAmount: nextBid };
}

// Get all interested AI bidders for a player
export function getInterestedBidders(
  teams: Team[],
  player: Player,
  currentBid: number,
  currentBidder: string | null,
  userTeamId: string
): Array<{ teamId: string; bidAmount: number }> {
  const interested: Array<{ teamId: string; bidAmount: number }> = [];
  
  teams.forEach(team => {
    // Skip user team (they bid manually)
    if (team.id === userTeamId) return;
    
    const result = shouldAIBid(team, player, currentBid, currentBidder);
    if (result.shouldBid) {
      interested.push({ teamId: team.id, bidAmount: result.bidAmount });
    }
  });
  
  // Shuffle to randomize who bids first
  return interested.sort(() => Math.random() - 0.5);
}
