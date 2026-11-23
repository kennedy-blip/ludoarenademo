import React from "react";
import { renderToString } from "react-dom/server";
import * as Lobby from "../src/components/Lobby.mjs";
import * as GameScreen from "../src/components/GameScreen.mjs";
import * as BoardView from "../src/components/BoardView.mjs";
import * as WalletModal from "../src/components/WalletModal.mjs";
import * as Game from "../src/engine/Game.mjs";
import * as Types from "../src/engine/Types.mjs";
import * as Wallet from "../src/wallet/Wallet.mjs";

const h = React.createElement;
const noop = () => {};
let failures = 0;
function check(name, fn) {
  try {
    const html = fn();
    console.log(`OK   ${name}  (${html.length} bytes)`);
    return html;
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}: ${e.message}`);
    return "";
  }
}

const lobby = check("Lobby", () => renderToString(h(Lobby.make, { balance: 123400, onStart: noop, onOpenWallet: noop })));

const seeds = [
  { seedId: "p1", seedName: "You", seedColor: "Red", seedIsBot: false },
  { seedId: "p2", seedName: "Bot 1", seedColor: "Green", seedIsBot: true },
];
const g = Game.create(seeds, 7, "Beast", 10000);
const game = check("GameScreen", () =>
  renderToString(h(GameScreen.make, {
    state: g, balance: 500000, onRoll: noop, onMove: noop, onExit: noop,
    onOpenWallet: noop, onClaim: noop, claimed: false,
  })));

const board = check("BoardView", () => renderToString(h(BoardView.make, { state: g, onTokenClick: noop })));

const w = Wallet.load();
check("WalletModal", () =>
  renderToString(h(WalletModal.make, {
    wallet: w, open_: true, onClose: noop, onDeposit: () => true,
    onWithdraw: () => true, onDemo: noop,
  })));

// Content assertions
const asserts = [
  ["lobby hero", lobby.includes("Play Ludo")],
  ["lobby free mode", lobby.includes("Free Mode")],
  ["lobby beast mode", lobby.includes("Beast Mode")],
  ["game prize pool", game.includes("Prize Pool")],
  ["board 225 cells", (board.match(/rounded-full/g) || []).length >= 8],
  ["board yards painted", board.includes("bg-red-500")],
  ["board home column", board.includes("bg-green-100")],
];
console.log("");
for (const [name, ok] of asserts) {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}`);
}
console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURES"}`);
process.exit(failures === 0 ? 0 : 1);
