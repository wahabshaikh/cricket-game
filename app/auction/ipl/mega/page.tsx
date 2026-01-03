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
    <div className="min-h-screen relative overflow-hidden noise-overlay vignette stadium-pattern">
      {/* Deep noir background with radial gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, hsl(220 20% 12%) 0%, hsl(220 20% 4%) 70%),
            linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(220 20% 3%) 100%)
          `
        }}
      />
      
      {/* Spotlight effect from top */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] -z-5"
        style={{
          background: `radial-gradient(ellipse at center top, hsl(45 80% 60% / 0.08) 0%, transparent 60%)`
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-slide-up">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-noir-charcoal/80 border border-noir-steel/50 mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jade opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-jade"></span>
            </span>
            <span className="text-jade font-mono text-xs tracking-widest uppercase">Live Auction</span>
          </div>

          {/* Main title */}
          <h1 className="font-display text-7xl md:text-9xl gradient-text-gold text-glow-gold tracking-wider mb-4">
            IPL MEGA AUCTION
          </h1>
          <p className="font-body text-noir-silver text-xl italic">
            Select your franchise to begin
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 max-w-6xl w-full">
          {teams.map((team, index) => (
            <button
              key={team.id}
              onClick={() => onSelect(team.id)}
              className="group relative animate-fade-slide-up auction-card"
              style={{ 
                animationDelay: `${150 + index * 50}ms`,
                animationFillMode: 'backwards'
              }}
            >
              {/* Card background with team gradient */}
              <div 
                className="relative p-6 rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  background: `linear-gradient(145deg, ${team.primary_color}15 0%, hsl(220 15% 10%) 50%, ${team.secondary_color}10 100%)`,
                  border: `1px solid ${team.primary_color}30`,
                }}
              >
                {/* Hover glow overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: `radial-gradient(circle at 50% 50%, ${team.primary_color}20 0%, transparent 70%)` 
                  }}
                />

                {/* Team badge */}
                <div
                  className="relative w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center font-display text-2xl tracking-wider shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{ 
                    background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || team.primary_color} 100%)`,
                    boxShadow: `0 8px 32px ${team.primary_color}40`
                  }}
                >
                  <span className="text-white drop-shadow-lg">{team.id}</span>
                </div>

                {/* Team name */}
                <h3 className="relative font-display text-xl text-noir-white text-center tracking-wide mb-2">
                  {team.name.toUpperCase()}
                </h3>

                {/* Purse */}
                <p className="relative font-mono text-noir-smoke text-center text-sm">
                  ₹120 Cr
                </p>

                {/* Bottom accent line */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${team.primary_color}, transparent)` }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <p className="mt-12 font-body text-noir-smoke text-sm animate-fade-slide-up delay-700">
          250 Players • ₹120 Crore Budget • Build Your Dream Team
        </p>
      </div>
    </div>
  );
}

// ===============================
// CIRCULAR PROGRESS TIMER
// ===============================
function CircularTimer({ 
  progress, 
  size = 80, 
  strokeWidth = 6,
  isUrgent = false 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  isUrgent?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg 
        width={size} 
        height={size} 
        className="progress-ring"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(220 10% 20%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isUrgent ? "hsl(0 70% 55%)" : "hsl(45 90% 55%)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={isUrgent ? "animate-pulse-glow" : ""}
          style={{ 
            filter: isUrgent ? "drop-shadow(0 0 8px hsl(0 70% 55%))" : "drop-shadow(0 0 4px hsl(45 90% 55% / 0.5))"
          }}
        />
      </svg>
      {/* Timer text in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono text-lg font-bold ${isUrgent ? "text-crimson" : "text-gold"}`}>
          {Math.ceil(progress / (100 / (BID_TIMER / 1000)))}s
        </span>
      </div>
    </div>
  );
}

// ===============================
// PLAYER CARD
// ===============================
function PlayerCard({ player, size = "large" }: { player: Player; size?: "large" | "small" }) {
  const roleConfig = {
    BAT: { 
      gradient: "from-blue-500 to-blue-700", 
      label: "BATTER",
      icon: "🏏"
    },
    WK: { 
      gradient: "from-purple-500 to-purple-700", 
      label: "WICKETKEEPER",
      icon: "🧤"
    },
    AR: { 
      gradient: "from-emerald-500 to-emerald-700", 
      label: "ALL-ROUNDER",
      icon: "⚡"
    },
    BOWL: { 
      gradient: "from-rose-500 to-rose-700", 
      label: "BOWLER",
      icon: "🎯"
    },
  };

  const config = roleConfig[player.role];
  const isLarge = size === "large";

  return (
    <div className={`glass-card rounded-2xl overflow-hidden ${isLarge ? "p-8" : "p-4"} animate-scale-in`}>
      {/* Role ribbon */}
      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-display tracking-wider text-white bg-gradient-to-r ${config.gradient} shadow-lg mb-6`}>
        <span>{config.icon}</span>
        {config.label}
      </div>

      {/* Player name */}
      <h2 className={`font-display text-noir-white ${isLarge ? "text-5xl mb-3" : "text-2xl mb-1"} tracking-wide`}>
        {player.name.toUpperCase()}
      </h2>
      
      {/* Nationality */}
      <p className={`font-body text-noir-silver italic ${isLarge ? "text-lg mb-8" : "text-sm mb-4"}`}>
        {player.nationality}
        {player.nationality !== "India" && <span className="ml-2 not-italic">🌍</span>}
      </p>

      {/* Stats with circular gauges */}
      <div className={`grid grid-cols-3 gap-6 ${isLarge ? "mb-8" : "mb-4"}`}>
        <StatGauge label="BAT" value={player.batting} color="hsl(220 80% 60%)" size={isLarge ? "large" : "small"} />
        <StatGauge label="BOWL" value={player.bowling} color="hsl(0 70% 55%)" size={isLarge ? "large" : "small"} />
        <StatGauge label="FIELD" value={player.fielding} color="hsl(160 60% 45%)" size={isLarge ? "large" : "small"} />
      </div>

      {/* Base price */}
      <div className={`bg-gradient-to-r from-noir-charcoal to-noir-steel/50 rounded-xl ${isLarge ? "p-5" : "p-3"} text-center border border-gold/20`}>
        <p className="font-mono text-gold/80 text-xs tracking-widest uppercase mb-1">Base Price</p>
        <p className={`font-display text-gold text-glow-gold ${isLarge ? "text-4xl" : "text-2xl"} tracking-wider`}>
          {formatPrice(player.basePrice)}
        </p>
      </div>
    </div>
  );
}

function StatGauge({ label, value, color, size }: { label: string; value: number; color: string; size: "large" | "small" }) {
  const gaugeSize = size === "large" ? 70 : 50;
  const strokeWidth = size === "large" ? 6 : 4;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={gaugeSize} height={gaugeSize} className="progress-ring">
          <circle
            cx={gaugeSize / 2}
            cy={gaugeSize / 2}
            r={radius}
            fill="none"
            stroke="hsl(220 10% 15%)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={gaugeSize / 2}
            cy={gaugeSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-noir-white font-bold" style={{ fontSize: size === "large" ? "16px" : "12px" }}>
            {value}
          </span>
        </div>
      </div>
      <span className="font-mono text-noir-smoke text-xs mt-2 tracking-wider">{label}</span>
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
  const timerProgress = (timer / BID_TIMER) * 100;
  const isUrgent = timer < 3000;

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-slide-in delay-200">
      {/* Timer */}
      <div className="flex justify-center mb-6">
        <CircularTimer progress={timerProgress} isUrgent={isUrgent && !isSold} />
      </div>

      {/* Current bid display */}
      <div className="text-center mb-6">
        <p className="font-mono text-noir-smoke text-xs tracking-widest uppercase mb-2">Current Bid</p>
        <div
          className="font-display text-6xl tracking-wider transition-all duration-300"
          style={{ 
            color: bidderTeam?.primary_color || "hsl(45 90% 55%)",
            textShadow: `0 0 30px ${bidderTeam?.primary_color || "hsl(45 90% 55%)"}50`
          }}
        >
          {formatPrice(currentBid)}
        </div>
        
        {/* Current bidder */}
        {bidderTeam && !isSold && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-display text-sm tracking-wide mt-4"
            style={{ 
              background: `linear-gradient(135deg, ${bidderTeam.primary_color} 0%, ${bidderTeam.secondary_color || bidderTeam.primary_color} 100%)`,
              boxShadow: `0 4px 20px ${bidderTeam.primary_color}40`
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            {bidderTeam.name}
          </div>
        )}
        {!bidderTeam && !isSold && (
          <p className="font-body text-noir-smoke italic mt-4">Awaiting bids...</p>
        )}
      </div>

      {/* SOLD banner */}
      {isSold && bidderTeam && (
        <div
          className="text-center py-5 rounded-xl font-display text-3xl tracking-widest text-white mb-6 animate-sold-burst"
          style={{ 
            background: `linear-gradient(135deg, ${bidderTeam.primary_color} 0%, ${bidderTeam.secondary_color || bidderTeam.primary_color} 100%)`,
            boxShadow: `0 0 40px ${bidderTeam.primary_color}60`
          }}
        >
          🎉 SOLD! 🎉
        </div>
      )}

      {/* User controls */}
      {!isSold && (
        <div className="space-y-3">
          <button
            onClick={onBid}
            disabled={!canUserBid || isUserWinning}
            className={`w-full py-4 rounded-xl font-display text-xl tracking-wide transition-all duration-200 ${
              canUserBid && !isUserWinning
                ? "bg-gradient-to-r from-jade to-emerald-600 text-white hover:from-jade hover:to-emerald-500 glow-jade hover:scale-[1.02]"
                : isUserWinning
                ? "bg-gradient-to-r from-gold/20 to-amber-500/20 text-gold border border-gold/30"
                : "bg-noir-steel/50 text-noir-smoke cursor-not-allowed"
            }`}
          >
            {isUserWinning
              ? "✓ YOU ARE WINNING"
              : canUserBid
              ? `BID ${formatPrice(nextBid)}`
              : "CANNOT BID"}
          </button>

          <button
            onClick={onPass}
            className="w-full py-3 rounded-xl font-body text-noir-silver hover:text-noir-white hover:bg-noir-steel/30 transition-all"
          >
            Pass
          </button>
        </div>
      )}

      {/* User purse info */}
      <div className="mt-6 pt-6 border-t border-noir-steel/50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-noir-smoke text-xs tracking-wider uppercase">Your Purse</span>
          <span className="font-display text-noir-white text-lg tracking-wide">
            {formatPrice(userTeam?.purse || 0)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-noir-smoke text-xs tracking-wider uppercase">Squad</span>
          <span className="font-mono text-noir-silver">
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
    <div className="glass-card rounded-2xl p-5 animate-fade-slide-in delay-100">
      <h3 className="font-display text-noir-white text-lg tracking-wide mb-4">FRANCHISES</h3>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {teams.map((team, index) => {
          const stats = getTeamStats(team);
          const isUser = team.id === userTeamId;

          return (
            <div
              key={team.id}
              className={`p-3 rounded-lg transition-all animate-fade-slide-in ${
                isUser ? "ring-1 ring-gold/50" : ""
              }`}
              style={{
                animationDelay: `${index * 30}ms`,
                background: `linear-gradient(90deg, ${team.primary_color}15 0%, transparent 100%)`,
                borderLeft: `3px solid ${team.primary_color}`,
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-display text-xs tracking-wide text-white shadow-md"
                    style={{ 
                      background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || team.primary_color} 100%)`
                    }}
                  >
                    {team.id}
                  </span>
                  <div>
                    <p className="font-body text-noir-white text-sm">
                      {team.name}
                      {isUser && (
                        <span className="ml-2 font-mono text-xs text-gold">(YOU)</span>
                      )}
                    </p>
                    <p className="font-mono text-noir-smoke text-xs">
                      {stats.total} • {stats.overseas}/8 OS
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-noir-white text-sm">
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
  const recentLog = log.slice(-8).reverse();

  return (
    <div className="glass-card rounded-2xl p-5 max-h-64 overflow-y-auto animate-fade-slide-in delay-300">
      <h3 className="font-display text-noir-white text-lg tracking-wide mb-4">RECENT SALES</h3>
      {recentLog.length === 0 ? (
        <p className="font-body text-noir-smoke italic text-sm">No sales yet</p>
      ) : (
        <div className="space-y-2">
          {recentLog.map((entry, i) => {
            const team = teams.find((t) => t.id === entry.soldTo);
            return (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-noir-steel/30 last:border-0 animate-fade-slide-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div>
                  <p className="font-body text-noir-white text-sm">
                    {entry.playerName}
                  </p>
                  <p
                    className="font-mono text-xs"
                    style={{ color: team?.primary_color || "hsl(220 8% 40%)" }}
                  >
                    {team?.name || "UNSOLD"}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-bold ${
                    entry.soldTo ? "text-jade" : "text-noir-smoke"
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
    <div className="min-h-screen relative overflow-hidden noise-overlay vignette stadium-pattern">
      {/* Background */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, hsl(220 20% 12%) 0%, hsl(220 20% 4%) 70%),
            linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(220 20% 3%) 100%)
          `
        }}
      />

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-slide-up">
          <h1 className="font-display text-6xl md:text-8xl gradient-text-gold text-glow-gold tracking-wider mb-4">
            AUCTION COMPLETE
          </h1>
          <p className="font-body text-noir-silver text-xl italic">Review the final squads</p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team selector */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-5 sticky top-8 animate-fade-slide-in">
              <h3 className="font-display text-noir-white text-lg tracking-wide mb-4">SELECT TEAM</h3>
              <div className="space-y-2">
                {teams.map((team, index) => {
                  const teamStats = getTeamStats(team);
                  const isSelected = team.id === selectedTeam;
                  const isUser = team.id === userTeamId;

                  return (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full p-3 rounded-lg text-left transition-all animate-fade-slide-in ${
                        isSelected ? "ring-1" : ""
                      }`}
                      style={{
                        animationDelay: `${index * 30}ms`,
                        background: isSelected
                          ? `${team.primary_color}25`
                          : `${team.primary_color}10`,
                        borderLeft: `3px solid ${team.primary_color}`,
                        // @ts-expect-error CSS custom property for ring color
                        "--tw-ring-color": team.primary_color,
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-body text-noir-white">
                          {team.name}
                          {isUser && (
                            <span className="ml-2 font-mono text-xs text-gold">
                              (YOU)
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-noir-smoke text-sm">
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
              <div className="glass-card rounded-2xl p-6 animate-scale-in">
                {/* Team header */}
                <div
                  className="flex items-center gap-4 mb-6 pb-6 border-b"
                  style={{ borderColor: `${displayTeam.primary_color}30` }}
                >
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center font-display text-2xl text-white tracking-wide shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${displayTeam.primary_color} 0%, ${displayTeam.secondary_color || displayTeam.primary_color} 100%)`,
                      boxShadow: `0 8px 32px ${displayTeam.primary_color}40`
                    }}
                  >
                    {displayTeam.id}
                  </div>
                  <div>
                    <h2 className="font-display text-4xl text-noir-white tracking-wide">
                      {displayTeam.name.toUpperCase()}
                    </h2>
                    <p className="font-body text-noir-silver">
                      Remaining: {formatPrice(displayTeam.purse)} • Spent: {formatPrice(INITIAL_PURSE - displayTeam.purse)}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                  <ResultStat label="Total" value={stats.total} />
                  <ResultStat label="Batters" value={stats.batters} />
                  <ResultStat label="WK" value={stats.wicketkeepers} />
                  <ResultStat label="All-R" value={stats.allrounders} />
                  <ResultStat label="Bowlers" value={stats.bowlers} />
                  <ResultStat label="Overseas" value={`${stats.overseas}/8`} highlight />
                </div>

                {/* Players by role */}
                <div className="space-y-6">
                  {(["BAT", "WK", "AR", "BOWL"] as const).map((role) => {
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
                        <h4 className="font-display text-noir-white text-lg tracking-wide mb-3">
                          {roleLabels[role]} ({rolePlayers.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rolePlayers.map((player, i) => (
                            <div
                              key={i}
                              className="bg-noir-charcoal/50 rounded-xl p-4 flex justify-between items-center border border-noir-steel/30"
                            >
                              <div>
                                <p className="font-body text-noir-white">
                                  {player.name}
                                  {player.nationality !== "India" && (
                                    <span className="ml-2 text-xs text-gold">
                                      🌍
                                    </span>
                                  )}
                                </p>
                                <p className="font-mono text-noir-smoke text-sm">
                                  {player.nationality}
                                </p>
                              </div>
                              <span className="font-mono text-jade font-bold">
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
    </div>
  );
}

function ResultStat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`bg-noir-charcoal/50 rounded-xl p-3 text-center border ${highlight ? "border-gold/30" : "border-noir-steel/30"}`}>
      <p className="font-mono text-noir-smoke text-xs tracking-wider uppercase">{label}</p>
      <p className={`font-display text-2xl ${highlight ? "text-gold" : "text-noir-white"}`}>{value}</p>
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

    const aiInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        runAIBidding();
      }
    }, 800);

    return () => clearInterval(aiInterval);
  }, [phase, auctionState, isSold, isPaused, runAIBidding]);

  // Handle timer expiry (SOLD or UNSOLD)
  useEffect(() => {
    if (phase !== "auction" || !auctionState || isSold || isPaused) return;

    if (timer <= 0) {
      if (auctionState.currentBidder) {
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
  const canUserBidCheck = () => {
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
      <div className="min-h-screen relative overflow-hidden noise-overlay vignette stadium-pattern">
        {/* Background */}
        <div 
          className="absolute inset-0 -z-10"
          style={{
            background: `
              radial-gradient(ellipse at 50% 0%, hsl(220 20% 12%) 0%, hsl(220 20% 4%) 70%),
              linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(220 20% 3%) 100%)
            `
          }}
        />

        {/* Header */}
        <header className="relative z-10 glass-card border-b border-noir-steel/50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="animate-fade-slide-in">
              <h1 className="font-display text-3xl gradient-text-gold tracking-wider">
                IPL MEGA AUCTION
              </h1>
              <p className="font-mono text-noir-smoke text-sm">
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
                className={`px-4 py-2 rounded-lg font-display text-sm tracking-wide transition-all ${
                  isPaused
                    ? "bg-jade/20 text-jade hover:bg-jade/30 border border-jade/30"
                    : "bg-noir-steel/50 text-noir-silver hover:bg-noir-steel/70 border border-noir-steel/50"
                }`}
              >
                {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
              </button>
              <div className="text-right">
                <span className="font-mono text-noir-smoke text-xs tracking-wider uppercase">Progress</span>
                <div className="w-32 h-2 bg-noir-steel rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-ember transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
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
              canUserBid={canUserBidCheck()}
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
