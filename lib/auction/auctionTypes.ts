// Types for IPL Mega Auction

export interface Player {
  name: string;
  nationality: string;
  role: 'BAT' | 'WK' | 'AR' | 'BOWL';
  batting: number;
  bowling: number;
  fielding: number;
  set: string;
  basePrice: number;
  soldPrice?: number;
  soldTo?: string;
}

export interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  purse: number;
  players: Player[];
  isUserTeam: boolean;
}

export interface AuctionState {
  phase: 'team-selection' | 'auction' | 'results';
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: string | null;
  teams: Team[];
  remainingPlayers: Player[];
  soldPlayers: Player[];
  unsoldPlayers: Player[];
  timer: number;
  auctionLog: AuctionLogEntry[];
}

export interface AuctionLogEntry {
  playerName: string;
  soldTo: string | null;
  soldPrice: number;
  timestamp: Date;
}

export interface TeamNeeds {
  batters: number;
  wicketkeepers: number;
  allrounders: number;
  bowlers: number;
  overseas: number;
  total: number;
}

export type TeamPersonality = 'aggressive' | 'conservative' | 'balanced';
