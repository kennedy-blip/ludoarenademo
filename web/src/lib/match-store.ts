"use client";

import { create } from "zustand";
import {
  botMove,
  createGame,
  currentPlayer,
  legalTokens,
  moveToken,
  rollDice,
  winnerId,
} from "./engine/game";
import { randomSeed } from "./engine/rng";
import type { GameState, PlayerColor, PlayerSeed } from "./engine/types";

export interface PlayerProfile {
  id: string;
  username: string;
  avatar: string;
  rating: number;
}

export interface MatchConfig {
  mode: "free" | "beast";
  entryFeeCents: number;
  players: PlayerProfile[];
  colors: PlayerColor[];
}

export interface MatchStore {
  game: GameState | null;
  profiles: Record<string, PlayerProfile>;
  busy: boolean;
  lastCaptured: string[];
  startMatch: (config: MatchConfig) => void;
  startLocal: (opts: { mode: "free" | "beast"; entryFeeCents: number; opponents: number }) => void;
  canRoll: () => boolean;
  roll: () => void;
  move: (tokenId: number) => void;
  pass: () => void;
  end: () => void;
  currentPlayerIsBot: () => boolean;
  legal: () => number[];
}

const DEFAULT_PROFILES: Record<string, PlayerProfile> = {};

let botTimer: ReturnType<typeof setTimeout> | null = null;

function clearBotTimer() {
  if (botTimer) {
    clearTimeout(botTimer);
    botTimer = null;
  }
}

export const useMatch = create<MatchStore>()((set, get) => {
  /** Drives bot seats: roll, then move, then schedule the next one. */
  const stepBot = () => {
    clearBotTimer();
    const { game } = get();
    if (!game || game.phase === "finished") return;
    const player = currentPlayer(game);
    if (!player.isBot) return;

    if (game.phase === "awaiting_roll") {
      botTimer = setTimeout(() => {
        const cur = get().game;
        if (!cur || cur.phase !== "awaiting_roll") return;
        set({ game: rollDice(cur) });
        stepBot();
      }, 620);
      return;
    }

    botTimer = setTimeout(() => {
      const cur = get().game;
      if (!cur || cur.phase !== "awaiting_move") return;
      const id = botMove(cur);
      if (id === null) {
        set({ game: { ...cur, phase: "awaiting_roll", dice: null, turn: (cur.turn + 1) % cur.players.length } });
      } else {
        const res = moveToken(cur, id);
        set({ game: res.state, lastCaptured: res.captured });
      }
      stepBot();
    }, 780);
  };

  return {
    game: null,
    profiles: DEFAULT_PROFILES,
    busy: false,
    lastCaptured: [],

    startMatch: (config) => {
      clearBotTimer();
      const ids = new Set(config.players.map((p) => p.id));
      if (ids.size !== config.players.length) throw new Error("duplicate player ids");
      if (config.players.length !== config.colors.length) throw new Error("colour mismatch");

      const seeds: PlayerSeed[] = config.players.map((p, i) => ({
        id: p.id,
        name: p.username,
        color: config.colors[i],
        isBot: false,
      }));

      const profiles: Record<string, PlayerProfile> = {};
      config.players.forEach((p) => (profiles[p.id] = p));

      const game = createGame(seeds, {
        seed: randomSeed(),
        mode: config.mode,
        entryFee: Math.round(config.entryFeeCents / 100),
      });
      set({ game, profiles, lastCaptured: [], busy: false });
    },

    startLocal: ({ mode, entryFeeCents, opponents }) => {
      clearBotTimer();
      const colors: PlayerColor[] = ["red", "green", "yellow", "blue"];
      const usernames = ["You", "Simba_254", "MombasaKing", "KisumuSwift"];
      const ratings = [1000, 1380, 1255, 1180];
      const avatars = ["🙂", "🦁", "👑", "⚡"];

      const profiles: Record<string, PlayerProfile> = {};
      const seeds: PlayerSeed[] = [];

      profiles["me"] = { id: "me", username: "You", avatar: "🙂", rating: 1000 };
      seeds.push({ id: "me", name: "You", color: colors[0], isBot: false });

      for (let i = 1; i <= opponents; i++) {
        const id = `bot-${i}`;
        profiles[id] = {
          id,
          username: usernames[i],
          avatar: avatars[i],
          rating: ratings[i],
        };
        seeds.push({ id, name: usernames[i], color: colors[i], isBot: true });
      }

      const game = createGame(seeds, {
        seed: randomSeed(),
        mode,
        entryFee: Math.round(entryFeeCents / 100),
      });
      set({ game, profiles, lastCaptured: [], busy: false });
      stepBot();
    },

    canRoll: () => {
      const { game } = get();
      return Boolean(game && game.phase === "awaiting_roll" && !currentPlayer(game).isBot);
    },

    roll: () => {
      const { game } = get();
      if (!game || game.phase !== "awaiting_roll") return;
      if (currentPlayer(game).isBot) return;
      set({ game: rollDice(game) });
      stepBot();
    },

    move: (tokenId) => {
      const { game } = get();
      if (!game || game.phase !== "awaiting_move") return;
      if (currentPlayer(game).isBot) return;
      const res = moveToken(game, tokenId);
      set({ game: res.state, lastCaptured: res.captured });
      stepBot();
    },

    pass: () => {
      const { game } = get();
      if (!game) return;
      set({
        game: {
          ...game,
          dice: null,
          phase: "awaiting_roll",
          turn: (game.turn + 1) % game.players.length,
        },
      });
      stepBot();
    },

    end: () => {
      clearBotTimer();
      set({ game: null, lastCaptured: [] });
    },

    currentPlayerIsBot: () => {
      const { game } = get();
      return Boolean(game && currentPlayer(game).isBot);
    },

    legal: () => {
      const { game } = get();
      if (!game || game.phase !== "awaiting_move") return [];
      return legalTokens(game, game.dice ?? 0);
    },
  };
});

export const matchWinner = (game: GameState | null) =>
  game ? winnerId(game) : null;
