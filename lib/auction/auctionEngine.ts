// Auction Engine - Core logic for IPL Mega Auction

import { Player, Team, AuctionState } from './auctionTypes';
import { INITIAL_PURSE, PRICE_TIERS, BID_INCREMENTS } from './auctionConstants';
import playersData from '@/data/players.json';
import teamsData from '@/data/teams.json';

// Count sets per role category
function countSetsPerRole(data: Record<string, unknown[]>): Record<string, number> {
  const counts: Record<string, number> = { BAT: 0, WK: 0, AR: 0, BOWL: 0 };
  
  Object.keys(data).forEach(key => {
    if (key.startsWith('BAT')) counts.BAT++;
    else if (key.startsWith('WK')) counts.WK++;
    else if (key.startsWith('AR')) counts.AR++;
    else if (key.startsWith('BOWL')) counts.BOWL++;
  });
  
  return counts;
}

// Determine base price tier based on set number and total sets
function getBasePrice(setKey: string, totalSets: Record<string, number>): number {
  const role = setKey.replace(/[0-9]/g, '');
  const setNum = parseInt(setKey.replace(/[^0-9]/g, ''), 10);
  const total = totalSets[role] || 10;
  
  // Calculate tier thresholds (each tier is ~20% of total sets)
  const tierSize = Math.max(1, Math.ceil(total / 5));
  
  if (setNum <= tierSize) return PRICE_TIERS.MARQUEE;           // First ~20%
  if (setNum <= tierSize * 2) return PRICE_TIERS.TIER_2;        // 20-40%
  if (setNum <= tierSize * 3) return PRICE_TIERS.TIER_3;        // 40-60%
  if (setNum <= tierSize * 4) return PRICE_TIERS.TIER_4;        // 60-80%
  return PRICE_TIERS.TIER_5;                                     // 80-100%
}

// Load and prepare all players with base prices
export function loadPlayers(): Player[] {
  const players: Player[] = [];
  const data = playersData as Record<string, Array<{
    name: string;
    nationality: string;
    role: string;
    batting: number;
    bowling: number;
    fielding: number;
  }>>;
  
  const totalSets = countSetsPerRole(data);
  
  // Define auction order: Marquee sets first, then by category
  const setKeys = Object.keys(data);
  
  // Sort sets: first by tier (lower set number = higher tier), then by category
  const sortedSets = setKeys.sort((a, b) => {
    const aNum = parseInt(a.replace(/[^0-9]/g, ''), 10);
    const bNum = parseInt(b.replace(/[^0-9]/g, ''), 10);
    
    // Marquee sets first (set 1-2)
    if (aNum <= 2 && bNum > 2) return -1;
    if (bNum <= 2 && aNum > 2) return 1;
    
    // Then by set number
    if (aNum !== bNum) return aNum - bNum;
    
    // Then by category order: BAT > WK > AR > BOWL
    const order = ['BAT', 'WK', 'AR', 'BOWL'];
    const aRole = a.replace(/[0-9]/g, '');
    const bRole = b.replace(/[0-9]/g, '');
    return order.indexOf(aRole) - order.indexOf(bRole);
  });
  
  // Process each set
  sortedSets.forEach(setKey => {
    const setPlayers = data[setKey] || [];
    const basePrice = getBasePrice(setKey, totalSets);
    
    setPlayers.forEach(p => {
      players.push({
        name: p.name,
        nationality: p.nationality,
        role: p.role as 'BAT' | 'WK' | 'AR' | 'BOWL',
        batting: p.batting,
        bowling: p.bowling,
        fielding: p.fielding,
        set: setKey,
        basePrice,
      });
    });
  });
  
  return players;
}

// Initialize teams with purse and empty squads
export function initializeTeams(userTeamId: string): Team[] {
  return (teamsData as Array<{
    id: string;
    name: string;
    primary_color: string;
    secondary_color: string;
  }>).map(t => ({
    id: t.id,
    name: t.name,
    primary_color: t.primary_color,
    secondary_color: t.secondary_color,
    purse: INITIAL_PURSE,
    players: [],
    isUserTeam: t.id === userTeamId,
  }));
}

// Get next bid amount based on current bid
export function getNextBidAmount(currentBid: number): number {
  for (const rule of BID_INCREMENTS) {
    if (currentBid < rule.threshold) {
      return currentBid + rule.increment;
    }
  }
  return currentBid + 25; // Default 25L increment
}

// Handle player sold
export function handlePlayerSold(
  state: AuctionState,
  playerId: string,
  teamId: string,
  price: number
): AuctionState {
  const player = state.currentPlayer;
  if (!player) return state;
  
  const updatedTeams = state.teams.map(team => {
    if (team.id === teamId) {
      return {
        ...team,
        purse: team.purse - price,
        players: [...team.players, { ...player, soldPrice: price, soldTo: teamId }],
      };
    }
    return team;
  });
  
  const soldPlayer = { ...player, soldPrice: price, soldTo: teamId };
  
  return {
    ...state,
    teams: updatedTeams,
    soldPlayers: [...state.soldPlayers, soldPlayer],
    auctionLog: [
      ...state.auctionLog,
      { playerName: player.name, soldTo: teamId, soldPrice: price, timestamp: new Date() },
    ],
  };
}

// Handle player unsold
export function handlePlayerUnsold(state: AuctionState): AuctionState {
  const player = state.currentPlayer;
  if (!player) return state;
  
  return {
    ...state,
    unsoldPlayers: [...state.unsoldPlayers, player],
    auctionLog: [
      ...state.auctionLog,
      { playerName: player.name, soldTo: null, soldPrice: 0, timestamp: new Date() },
    ],
  };
}

// Get next player to auction
export function getNextPlayer(state: AuctionState): Player | null {
  if (state.remainingPlayers.length === 0) return null;
  return state.remainingPlayers[0];
}

// Move to next player
export function advanceToNextPlayer(state: AuctionState): AuctionState {
  const nextPlayer = state.remainingPlayers[1] || null;
  
  return {
    ...state,
    remainingPlayers: state.remainingPlayers.slice(1),
    currentPlayer: nextPlayer,
    currentBid: nextPlayer?.basePrice || 0,
    currentBidder: null,
    timer: 0,
  };
}

// Create initial auction state
export function createInitialAuctionState(userTeamId: string): AuctionState {
  const players = loadPlayers();
  const teams = initializeTeams(userTeamId);
  const firstPlayer = players[0] || null;
  
  return {
    phase: 'auction',
    currentPlayer: firstPlayer,
    currentBid: firstPlayer?.basePrice || 0,
    currentBidder: null,
    teams,
    remainingPlayers: players.slice(1),
    soldPlayers: [],
    unsoldPlayers: [],
    timer: 0,
    auctionLog: [],
  };
}

// Check if auction is complete
export function isAuctionComplete(state: AuctionState): boolean {
  return state.currentPlayer === null && state.remainingPlayers.length === 0;
}

// Get team stats summary
export function getTeamStats(team: Team): {
  batters: number;
  wicketkeepers: number;
  allrounders: number;
  bowlers: number;
  overseas: number;
  total: number;
  spent: number;
} {
  let batters = 0, wicketkeepers = 0, allrounders = 0, bowlers = 0, overseas = 0, spent = 0;
  
  team.players.forEach(p => {
    if (p.role === 'BAT') batters++;
    else if (p.role === 'WK') wicketkeepers++;
    else if (p.role === 'AR') allrounders++;
    else if (p.role === 'BOWL') bowlers++;
    
    if (p.nationality !== 'India') overseas++;
    spent += p.soldPrice || 0;
  });
  
  return { batters, wicketkeepers, allrounders, bowlers, overseas, total: team.players.length, spent };
}
