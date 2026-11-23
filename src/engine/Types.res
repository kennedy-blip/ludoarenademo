// Domain types for Ludo Arena.
//
// ReScript variants carry the invariants the old TypeScript unions only
// documented: a phase is exactly one of three things, and a token slot is
// either in the yard, on the ring, in the column, or home — never a loose int
// that happens to mean something.

type color = Red | Green | Yellow | Blue

type playerKind = Human | Bot

type mode = Free | Beast

// -1 => yard, 0..51 => ring, 52..56 => column, 57 => home
let yard = -1
let home = 57
let ringLast = 51
let ringLength = 52

type token = {
  id: int,
  mutable progress: int,
}

type player = {
  id: string,
  name: string,
  color: color,
  kind: playerKind,
  tokens: array<token>,
  mutable finishedRank: option<int>,
}

type gameEvent =
  | Roll({playerId: string, value: int, at: int})
  | Move({
      playerId: string,
      tokenId: int,
      from: int,
      to: int,
      captured: array<string>,
      at: int,
    })
  | Pass({playerId: string, at: int})
  | Finish({playerId: string, rank: int, at: int})

type phase = AwaitingRoll | AwaitingMove | Finished

type state = {
  version: int,
  mode: mode,
  seed: int,
  mutable rngCursor: int,
  players: array<player>,
  mutable turn: int,
  mutable dice: option<int>,
  mutable phase: phase,
  mutable consecutiveSixes: int,
  rankings: array<string>,
  entryFee: int,
  prizePool: int,
  log: array<gameEvent>,
  mutable tick: int,
}

type rules = {
  threeSixBust: bool,
  sixRollsAgain: bool,
  captureRollsAgain: bool,
  exactFinish: bool,
}

let defaultRules: rules = {
  threeSixBust: true,
  sixRollsAgain: true,
  captureRollsAgain: true,
  exactFinish: true,
}

type playerSeed = {
  seedId: string,
  seedName: string,
  seedColor: color,
  seedIsBot: bool,
}

let colorName = color =>
  switch color {
  | Red => "red"
  | Green => "green"
  | Yellow => "yellow"
  | Blue => "blue"
  }

let colorOfName = name =>
  switch name {
  | "red" => Some(Red)
  | "green" => Some(Green)
  | "yellow" => Some(Yellow)
  | "blue" => Some(Blue)
  | _ => None
  }

let modeName = mode =>
  switch mode {
  | Free => "free"
  | Beast => "beast"
  }

let human = p => p.kind == Human
let bot = p => p.kind == Bot
