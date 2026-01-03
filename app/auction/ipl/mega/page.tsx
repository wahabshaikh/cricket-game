"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Player, Team, AuctionState } from "@/lib/auction/auctionTypes";
import {
  loadPlayers,
  initializeTeams,
  getNextBidAmount,
  handlePlayerSold,
  handlePlayerUnsold,
  advanceToNextPlayer,
  isAuctionComplete,
  getTeamStats,
} from "@/lib/auction/auctionEngine";
import {
  getInterestedBidders,
  canTeamBid,
} from "@/lib/auction/aiBiddingStrategy";
import {
  formatPrice,
  INITIAL_PURSE,
  BID_TIMER,
  SOLD_DELAY,
} from "@/lib/auction/auctionConstants";
import teamsData from "@/data/teams.json";

// ===============================
// TEAM SELECTION SCREEN
// ===============================
function TeamSelector({
  onSelect,
}: {
  onSelect: (teamId: string) => void;
}) {
  const teams = teamsData as Array<{
    id: string;
    name: string;
    primary_color: string;
    secondary_color: string;
  }>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 mb-4 tracking-tight">
          IPL MEGA AUCTION
        </h1>
        <p className="text-slate-300 text-xl">Select your franchise to begin</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => onSelect(team.id)}
            className="group relative p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${team.primary_color}20 0%, ${team.secondary_color}20 100%)`,
              border: `2px solid ${team.primary_color}40`,
            }}
          >
            {/* Glow effect */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
              style={{ background: team.primary_color }}
            />
            
            {/* Team badge */}
            <div
              className="relative w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg"
              style={{ background: team.primary_color }}
            >
              {team.id}
            </div>
            
            {/* Team name */}
            <h3 className="relative text-white font-bold text-center text-lg">
              {team.name}
            </h3>
            
            {/* Purse */}
            <p className="relative text-slate-400 text-center text-sm mt-2">
              ₹120 Cr
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===============================
// PLAYER CARD
// ===============================
function PlayerCard({ player, size = "large" }: { player: Player; size?: "large" | "small" }) {
  const roleColors = {
    BAT: "from-blue-500 to-blue-600",
    WK: "from-purple-500 to-purple-600",
    AR: "from-green-500 to-green-600",
    BOWL: "from-red-500 to-red-600",
  };

  const roleLabels = {
    BAT: "BATTER",
    WK: "WICKETKEEPER",
    AR: "ALL-ROUNDER",
    BOWL: "BOWLER",
  };

  const isLarge = size === "large";

  return (
    <div
      className={`bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 overflow-hidden ${
        isLarge ? "p-8" : "p-4"
      }`}
    >
      {/* Role badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${roleColors[player.role]} mb-4`}>
        {roleLabels[player.role]}
      </div>

      {/* Player name */}
      <h2 className={`font-black text-white ${isLarge ? "text-4xl mb-2" : "text-xl mb-1"}`}>
        {player.name}
      </h2>
      
      {/* Nationality */}
      <p className={`text-slate-400 ${isLarge ? "text-lg mb-6" : "text-sm mb-3"}`}>
        {player.nationality}
      </p>

      {/* Stats */}
      <div className={`grid grid-cols-3 gap-4 ${isLarge ? "mb-6" : "mb-3"}`}>
        <StatBar label="BAT" value={player.batting} color="blue" size={size} />
        <StatBar label="BOWL" value={player.bowling} color="red" size={size} />
        <StatBar label="FIELD" value={player.fielding} color="green" size={size} />
      </div>

      {/* Base price */}
      <div className={`bg-amber-500/20 rounded-xl ${isLarge ? "p-4" : "p-2"} text-center`}>
        <p className="text-amber-400 text-xs font-medium">BASE PRICE</p>
        <p className={`text-amber-400 font-black ${isLarge ? "text-2xl" : "text-lg"}`}>
          {formatPrice(player.basePrice)}
        </p>
      </div>
    </div>
  );
}

function StatBar({ label, value, color, size }: { label: string; value: number; color: "blue" | "red" | "green"; size: "large" | "small" }) {
  const colorClasses = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    green: "bg-green-500",
  } as const;

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className={`${size === "large" ? "h-2" : "h-1.5"} bg-slate-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ===============================
// BIDDING PANEL
// ===============================
function BiddingPanel({
  currentBid,
  currentBidder,
  teams,
  userTeamId,
  onBid,
  onPass,
  canUserBid,
  timer,
  isSold,
}: {
  currentBid: number;
  currentBidder: string | null;
  teams: Team[];
  userTeamId: string;
  onBid: () => void;
  onPass: () => void;
  canUserBid: boolean;
  timer: number;
  isSold: boolean;
}) {
  const bidderTeam = teams.find((t) => t.id === currentBidder);
  const userTeam = teams.find((t) => t.id === userTeamId);
  const isUserWinning = currentBidder === userTeamId;
  const nextBid = getNextBidAmount(currentBid);

  return (
    <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-6">
      {/* Current bid display */}
      <div className="text-center mb-6">
        <p className="text-slate-400 text-sm mb-2">CURRENT BID</p>
        <div
          className="text-5xl font-black mb-2 transition-all duration-300"
          style={{ color: bidderTeam?.primary_color || "#FFD700" }}
        >
          {formatPrice(currentBid)}
        </div>
        {bidderTeam && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-sm"
            style={{ background: bidderTeam.primary_color }}
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {bidderTeam.name}
          </div>
        )}
        {!bidderTeam && !isSold && (
          <p className="text-slate-500 italic">Waiting for bids...</p>
        )}
      </div>

      {/* Timer bar */}
      {!isSold && (
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-amber-500 transition-all duration-100"
            style={{ width: `${(timer / BID_TIMER) * 100}%` }}
          />
        </div>
      )}

      {/* SOLD banner */}
      {isSold && bidderTeam && (
        <div
          className="text-center py-4 rounded-xl text-white font-black text-2xl mb-6 animate-pulse"
          style={{ background: bidderTeam.primary_color }}
        >
          SOLD!
        </div>
      )}

      {/* User controls */}
      {!isSold && (
        <div className="space-y-3">
          <button
            onClick={onBid}
            disabled={!canUserBid || isUserWinning}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              canUserBid && !isUserWinning
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-green-500/30"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isUserWinning
              ? "You are winning!"
              : canUserBid
              ? `BID ${formatPrice(nextBid)}`
              : "Cannot bid"}
          </button>

          <button
            onClick={onPass}
            className="w-full py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            Pass
          </button>
        </div>
      )}

      {/* User purse info */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Your Purse</span>
          <span className="text-white font-bold">
            {formatPrice(userTeam?.purse || 0)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-slate-400 text-sm">Squad Size</span>
          <span className="text-white font-bold">
            {userTeam?.players.length || 0} / 25
          </span>
        </div>
      </div>
    </div>
  );
}

// ===============================
// TEAM TRACKER SIDEBAR
// ===============================
function TeamTracker({ teams, userTeamId }: { teams: Team[]; userTeamId: string }) {
  return (
    <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-4">
      <h3 className="text-white font-bold mb-4">TEAMS</h3>
      <div className="space-y-2">
        {teams.map((team) => {
          const stats = getTeamStats(team);
          const isUser = team.id === userTeamId;

          return (
            <div
              key={team.id}
              className={`p-3 rounded-xl transition-all ${
                isUser ? "ring-2 ring-amber-400" : ""
              }`}
              style={{
                background: `${team.primary_color}15`,
                borderLeft: `4px solid ${team.primary_color}`,
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: team.primary_color }}
                  >
                    {team.id}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {team.name}
                      {isUser && (
                        <span className="ml-2 text-xs text-amber-400">(YOU)</span>
                      )}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {stats.total} players • {stats.overseas} overseas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">
                    {formatPrice(team.purse)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===============================
// AUCTION LOG
// ===============================
function AuctionLog({
  log,
  teams,
}: {
  log: Array<{ playerName: string; soldTo: string | null; soldPrice: number }>;
  teams: Team[];
}) {
  const recentLog = log.slice(-10).reverse();

  return (
    <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-4 max-h-64 overflow-y-auto">
      <h3 className="text-white font-bold mb-4">RECENT SALES</h3>
      {recentLog.length === 0 ? (
        <p className="text-slate-500 text-sm italic">No sales yet</p>
      ) : (
        <div className="space-y-2">
          {recentLog.map((entry, i) => {
            const team = teams.find((t) => t.id === entry.soldTo);
            return (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {entry.playerName}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: team?.primary_color || "#64748b" }}
                  >
                    {team?.name || "UNSOLD"}
                  </p>
                </div>
                <span
                  className={`font-bold text-sm ${
                    entry.soldTo ? "text-green-400" : "text-slate-500"
                  }`}
                >
                  {entry.soldTo ? formatPrice(entry.soldPrice) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===============================
// RESULTS SCREEN
// ===============================
function AuctionResults({ teams, userTeamId }: { teams: Team[]; userTeamId: string }) {
  const [selectedTeam, setSelectedTeam] = useState<string>(userTeamId);
  const displayTeam = teams.find((t) => t.id === selectedTeam);
  const stats = displayTeam ? getTeamStats(displayTeam) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 mb-4">
          AUCTION COMPLETE
        </h1>
        <p className="text-slate-300 text-xl">Review the final squads</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team selector */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-4 sticky top-8">
            <h3 className="text-white font-bold mb-4">SELECT TEAM</h3>
            <div className="space-y-2">
              {teams.map((team) => {
                const teamStats = getTeamStats(team);
                const isSelected = team.id === selectedTeam;
                const isUser = team.id === userTeamId;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      isSelected ? "ring-2" : ""
                    }`}
                    style={{
                      background: isSelected
                        ? `${team.primary_color}30`
                        : `${team.primary_color}10`,
                      borderLeft: `4px solid ${team.primary_color}`,
                      // @ts-expect-error CSS custom property for Tailwind ring color
                      "--tw-ring-color": team.primary_color,
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">
                        {team.name}
                        {isUser && (
                          <span className="ml-2 text-xs text-amber-400">
                            (YOU)
                          </span>
                        )}
                      </span>
                      <span className="text-slate-400 text-sm">
                        {teamStats.total} players
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Squad display */}
        <div className="lg:col-span-2">
          {displayTeam && stats && (
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-6">
              {/* Team header */}
              <div
                className="flex items-center gap-4 mb-6 pb-6 border-b"
                style={{ borderColor: `${displayTeam.primary_color}40` }}
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: displayTeam.primary_color }}
                >
                  {displayTeam.id}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">
                    {displayTeam.name}
                  </h2>
                  <p className="text-slate-400">
                    Remaining Purse: {formatPrice(displayTeam.purse)} | Total
                    Spent: {formatPrice(INITIAL_PURSE - displayTeam.purse)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <Stat label="Total" value={stats.total} />
                <Stat label="Batters" value={stats.batters} />
                <Stat label="WK" value={stats.wicketkeepers} />
                <Stat label="All-R" value={stats.allrounders} />
                <Stat label="Bowlers" value={stats.bowlers} />
                <Stat label="Overseas" value={`${stats.overseas}/8`} />
              </div>

              {/* Players by role */}
              <div className="space-y-6">
                {["BAT", "WK", "AR", "BOWL"].map((role) => {
                  const rolePlayers = displayTeam.players.filter(
                    (p) => p.role === role
                  );
                  if (rolePlayers.length === 0) return null;

                  const roleLabels: Record<string, string> = {
                    BAT: "Batters",
                    WK: "Wicketkeepers",
                    AR: "All-Rounders",
                    BOWL: "Bowlers",
                  };

                  return (
                    <div key={role}>
                      <h4 className="text-white font-bold mb-3">
                        {roleLabels[role]} ({rolePlayers.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rolePlayers.map((player, i) => (
                          <div
                            key={i}
                            className="bg-slate-900/50 rounded-xl p-4 flex justify-between items-center"
                          >
                            <div>
                              <p className="text-white font-medium">
                                {player.name}
                                {player.nationality !== "India" && (
                                  <span className="ml-2 text-xs text-amber-400">
                                    🌍
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-400 text-sm">
                                {player.nationality}
                              </p>
                            </div>
                            <span className="text-green-400 font-bold">
                              {formatPrice(player.soldPrice || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-white font-bold text-xl">{value}</p>
    </div>
  );
}

// ===============================
// MAIN AUCTION PAGE
// ===============================
export default function IPLMegaAuctionPage() {
  const [phase, setPhase] = useState<"team-selection" | "auction" | "results">(
    "team-selection"
  );
  const [userTeamId, setUserTeamId] = useState<string>("");
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [timer, setTimer] = useState(0);
  const [isSold, setIsSold] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize auction when team is selected
  const handleTeamSelect = (teamId: string) => {
    setUserTeamId(teamId);
    const players = loadPlayers();
    const teams = initializeTeams(teamId);
    const firstPlayer = players[0];

    setAuctionState({
      phase: "auction",
      currentPlayer: firstPlayer,
      currentBid: firstPlayer.basePrice,
      currentBidder: null,
      teams,
      remainingPlayers: players.slice(1),
      soldPlayers: [],
      unsoldPlayers: [],
      timer: 0,
      auctionLog: [],
    });
    setPhase("auction");
    setTimer(BID_TIMER);
  };

  // AI bidding logic
  const runAIBidding = useCallback(() => {
    if (!auctionState || isSold || isPaused) return;

    const interested = getInterestedBidders(
      auctionState.teams,
      auctionState.currentPlayer!,
      auctionState.currentBid,
      auctionState.currentBidder,
      userTeamId
    );

    if (interested.length > 0) {
      // First interested team places a bid
      const bidder = interested[0];
      setAuctionState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentBid: bidder.bidAmount,
          currentBidder: bidder.teamId,
        };
      });
      setTimer(BID_TIMER);
    }
  }, [auctionState, isSold, isPaused, userTeamId]);

  // Timer and AI bidding effect
  useEffect(() => {
    if (phase !== "auction" || !auctionState || isSold || isPaused) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          // Time's up - trigger AI bidding or sell
          runAIBidding();
          return BID_TIMER;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, auctionState, isSold, isPaused, runAIBidding]);

  // Check for AI bids periodically
  useEffect(() => {
    if (phase !== "auction" || !auctionState || isSold || isPaused) return;

    // AI bids at random intervals
    const aiInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% chance to trigger AI bid check
        runAIBidding();
      }
    }, 800);

    return () => clearInterval(aiInterval);
  }, [phase, auctionState, isSold, isPaused, runAIBidding]);

  // Handle timer expiry (SOLD or UNSOLD)
  useEffect(() => {
    if (phase !== "auction" || !auctionState || isSold || isPaused) return;

    if (timer <= 0) {
      // Check if anyone bid
      if (auctionState.currentBidder) {
        // SOLD!
        setIsSold(true);
        const newState = handlePlayerSold(
          auctionState,
          auctionState.currentPlayer!.name,
          auctionState.currentBidder,
          auctionState.currentBid
        );

        setTimeout(() => {
          const nextState = advanceToNextPlayer({
            ...newState,
            remainingPlayers: auctionState.remainingPlayers,
          });

          if (isAuctionComplete(nextState)) {
            setAuctionState(nextState);
            setPhase("results");
          } else {
            setAuctionState(nextState);
            setIsSold(false);
            setTimer(BID_TIMER);
          }
        }, SOLD_DELAY);
      } else {
        // UNSOLD
        const newState = handlePlayerUnsold(auctionState);
        const nextState = advanceToNextPlayer({
          ...newState,
          remainingPlayers: auctionState.remainingPlayers,
        });

        if (isAuctionComplete(nextState)) {
          setAuctionState(nextState);
          setPhase("results");
        } else {
          setAuctionState(nextState);
          setTimer(BID_TIMER);
        }
      }
    }
  }, [timer, phase, auctionState, isSold, isPaused]);

  // User bid handler
  const handleUserBid = () => {
    if (!auctionState || isSold) return;

    const userTeam = auctionState.teams.find((t) => t.id === userTeamId);
    if (!userTeam) return;

    if (!canTeamBid(userTeam, auctionState.currentBid)) return;

    const nextBid = getNextBidAmount(auctionState.currentBid);

    setAuctionState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentBid: nextBid,
        currentBidder: userTeamId,
      };
    });
    setTimer(BID_TIMER);
  };

  // User pass handler
  const handlePass = () => {
    // Just wait for timer to expire naturally
  };

  // Check if user can bid
  const canUserBid = () => {
    if (!auctionState) return false;
    const userTeam = auctionState.teams.find((t) => t.id === userTeamId);
    if (!userTeam) return false;
    return canTeamBid(userTeam, auctionState.currentBid);
  };

  // Render based on phase
  if (phase === "team-selection") {
    return <TeamSelector onSelect={handleTeamSelect} />;
  }

  if (phase === "results" && auctionState) {
    return <AuctionResults teams={auctionState.teams} userTeamId={userTeamId} />;
  }

  if (phase === "auction" && auctionState && auctionState.currentPlayer) {
    const progress =
      ((auctionState.soldPlayers.length + auctionState.unsoldPlayers.length) /
        (auctionState.soldPlayers.length +
          auctionState.unsoldPlayers.length +
          auctionState.remainingPlayers.length +
          1)) *
      100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                IPL MEGA AUCTION
              </h1>
              <p className="text-slate-400 text-sm">
                Player {auctionState.soldPlayers.length + auctionState.unsoldPlayers.length + 1} of{" "}
                {auctionState.soldPlayers.length +
                  auctionState.unsoldPlayers.length +
                  auctionState.remainingPlayers.length +
                  1}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isPaused
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {isPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <div className="text-right">
                <span className="text-slate-400 text-xs">Progress</span>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar - Team tracker */}
          <aside className="lg:col-span-3 space-y-4">
            <TeamTracker teams={auctionState.teams} userTeamId={userTeamId} />
          </aside>

          {/* Center - Player card */}
          <div className="lg:col-span-5">
            <PlayerCard player={auctionState.currentPlayer} size="large" />
          </div>

          {/* Right sidebar - Bidding panel + Log */}
          <aside className="lg:col-span-4 space-y-4">
            <BiddingPanel
              currentBid={auctionState.currentBid}
              currentBidder={auctionState.currentBidder}
              teams={auctionState.teams}
              userTeamId={userTeamId}
              onBid={handleUserBid}
              onPass={handlePass}
              canUserBid={canUserBid()}
              timer={timer}
              isSold={isSold}
            />
            <AuctionLog log={auctionState.auctionLog} teams={auctionState.teams} />
          </aside>
        </main>
      </div>
    );
  }

  return null;
}
