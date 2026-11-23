"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  CENTER,
  HOME_COLUMN,
  RING_COORDS,
  SAFE_SQUARES,
  YARD_COORDS,
  tokenCoord,
} from "@/lib/engine/board";
import type { GameState, PlayerColor } from "@/lib/engine/types";

const COLOR_STYLE: Record<
  PlayerColor,
  { cell: string; token: string; yard: string; column: string; text: string }
> = {
  red: {
    cell: "bg-rose-500/85",
    token: "bg-gradient-to-br from-rose-300 to-rose-600 border-rose-100/70",
    yard: "bg-rose-500/12 border-rose-400/35",
    column: "bg-rose-500/35",
    text: "text-rose-300",
  },
  green: {
    cell: "bg-emerald-500/85",
    token: "bg-gradient-to-br from-emerald-300 to-emerald-600 border-emerald-100/70",
    yard: "bg-emerald-500/12 border-emerald-400/35",
    column: "bg-emerald-500/35",
    text: "text-emerald-300",
  },
  yellow: {
    cell: "bg-amber-400/90",
    token: "bg-gradient-to-br from-amber-200 to-amber-500 border-amber-50/80",
    yard: "bg-amber-400/12 border-amber-300/35",
    column: "bg-amber-400/35",
    text: "text-amber-300",
  },
  blue: {
    cell: "bg-sky-500/85",
    token: "bg-gradient-to-br from-sky-300 to-sky-600 border-sky-100/70",
    yard: "bg-sky-500/12 border-sky-400/35",
    column: "bg-sky-500/35",
    text: "text-sky-300",
  },
};

const YARD_BOX: Record<PlayerColor, { row: number; col: number }> = {
  red: { row: 1, col: 10 },
  green: { row: 1, col: 1 },
  yellow: { row: 10, col: 1 },
  blue: { row: 10, col: 10 },
};

interface BoardProps {
  game: GameState;
  legalTokens: number[];
  onPick: (tokenId: number) => void;
  interactive: boolean;
  stacked?: Record<string, number>;
}

export function Board({ game, legalTokens, onPick, interactive }: BoardProps) {
  const tokenAt = useMemo(() => {
    const map = new Map<string, { color: PlayerColor; id: number; movable: boolean }[]>();
    game.players.forEach((player) => {
      player.tokens.forEach((t) => {
        const [r, c] = tokenCoord(player.color, t.progress, t.id);
        const key = `${r}:${c}`;
        const list = map.get(key) ?? [];
        list.push({
          color: player.color,
          id: t.id,
          movable: interactive && player.id === game.players[game.turn].id && legalTokens.includes(t.id),
        });
        map.set(key, list);
      });
    });
    return map;
  }, [game, legalTokens, interactive]);

  const cells: React.ReactNode[] = [];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      cells.push(renderCell(row, col));
    }
  }

  function ringColorAt(row: number, col: number): PlayerColor | null {
    const idx = RING_COORDS.findIndex(([r, c]) => r === row && c === col);
    if (idx === -1) return null;
    if (idx === 0) return "red";
    if (idx === 13) return "green";
    if (idx === 26) return "yellow";
    if (idx === 39) return "blue";
    return null;
  }

  function renderCell(row: number, col: number) {
    const key = `${row}:${col}`;
    const here = tokenAt.get(key) ?? [];
    const isCenter = row >= 6 && row <= 8 && col >= 6 && col <= 8;
    if (isCenter) {
      const centerTokens = here;
      return (
        <div
          key={key}
          className="relative grid place-items-center rounded-md bg-gradient-to-br from-violet-600/50 via-fuchsia-500/35 to-amber-400/40"
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        >
          {row === 7 && col === 7 && (
            <div className="flex flex-wrap items-center justify-center gap-0.5 p-0.5">
              {centerTokens.map((t, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 w-1.5 rounded-full border border-white/60", COLOR_STYLE[t.color].token)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    const ringIdx = RING_COORDS.findIndex(([r, c]) => r === row && c === col);
    const ringColor = ringColorAt(row, col);
    const safe = ringIdx !== -1 && SAFE_SQUARES.includes(ringIdx);

    let columnColor: PlayerColor | null = null;
    for (const color of ["red", "green", "yellow", "blue"] as PlayerColor[]) {
      if (HOME_COLUMN[color].some(([r, c]) => r === row && c === col)) {
        columnColor = color;
        break;
      }
    }

    const isYard = Object.values(YARD_BOX).some(
      (b) => row >= b.row && row <= b.row + 4 && col >= b.col && col <= b.col + 4,
    );

    if (isYard && !ringColor && ringIdx === -1 && !columnColor) {
      const owner = (Object.entries(YARD_BOX) as [PlayerColor, { row: number; col: number }][]).find(
        ([, b]) => row >= b.row && row <= b.row + 4 && col >= b.col && col <= b.col + 4,
      )?.[0];
      const inNest = owner
        ? YARD_COORDS[owner].some(([r, c]) => r === row && c === col)
        : false;
      return (
        <div
          key={key}
          className={cn(
            "relative rounded-[3px]",
            owner && COLOR_STYLE[owner].yard,
            inNest && "ring-1 ring-white/20",
          )}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        >
          {here.length > 0 && (
            <div className="absolute inset-0 grid place-items-center">
              <TokenCluster tokens={here} onPick={onPick} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={key}
        className={cn(
          "relative rounded-[3px]",
          columnColor
            ? COLOR_STYLE[columnColor].column
            : ringIdx !== -1
              ? ringColor
                ? COLOR_STYLE[ringColor].cell
                : "bg-white/[0.07]"
              : "bg-transparent",
          ringIdx !== -1 && "border border-white/10",
        )}
        style={{ gridRow: row + 1, gridColumn: col + 1 }}
      >
        {safe && (
          <span className="absolute inset-0 grid place-items-center text-[7px] leading-none text-white/55">
            ★
          </span>
        )}
        {here.length > 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <TokenCluster tokens={here} onPick={onPick} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-amber-400/20 blur-xl" />
      <div
        className="relative grid aspect-square w-full gap-[2px] rounded-2xl border border-white/15 bg-[#120a2e]/90 p-1.5 shadow-2xl"
        style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gridTemplateRows: "repeat(15, minmax(0, 1fr))" }}
      >
        {cells}
      </div>
    </div>
  );
}

function TokenCluster({
  tokens,
  onPick,
}: {
  tokens: { color: PlayerColor; id: number; movable: boolean }[];
  onPick: (id: number) => void;
}) {
  const shown = tokens.slice(0, 4);
  const overflow = tokens.length - shown.length;
  return (
    <div className="relative grid grid-cols-2 place-items-center gap-[1px]">
      {shown.map((t) => (
        <button
          key={`${t.color}-${t.id}`}
          type="button"
          disabled={!t.movable}
          onClick={() => t.movable && onPick(t.id)}
          aria-label={`${t.color} token ${t.id + 1}${t.movable ? " — tap to move" : ""}`}
          className={cn(
            "h-[68%] w-[68%] min-h-[6px] min-w-[6px] rounded-full border shadow transition",
            COLOR_STYLE[t.color].token,
            t.movable
              ? "animate-pulse-ring cursor-pointer ring-2 ring-amber-300/90 hover:scale-125"
              : "opacity-90",
          )}
        />
      ))}
      {overflow > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-black/70 px-1 text-[7px] text-white">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export { COLOR_STYLE };
