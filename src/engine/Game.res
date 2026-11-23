// Pure game rules. State in, state out — no timers, no I/O, no React.
//
// The client and the server run this same function over the same seed, which is
// what lets a finished match be verified by replay.

open Types

let tokensPerPlayer = 4

let mkToken = id => {id: id, progress: yard}

let copyToken = (t: token) => {id: t.id, progress: t.progress}

let copyPlayer = (p: player) : player => {
  id: p.id,
  name: p.name,
  color: p.color,
  kind: p.kind,
  tokens: p.tokens->Array.map(copyToken),
  finishedRank: p.finishedRank,
}

let clone = s => {
  version: s.version,
  mode: s.mode,
  seed: s.seed,
  rngCursor: s.rngCursor,
  players: s.players->Array.map(copyPlayer),
  turn: s.turn,
  dice: s.dice,
  phase: s.phase,
  consecutiveSixes: s.consecutiveSixes,
  rankings: Array.copy(s.rankings),
  entryFee: s.entryFee,
  prizePool: s.prizePool,
  log: Array.copy(s.log),
  tick: s.tick,
}

let create = (seeds: array<playerSeed>, ~seed: int, ~mode: mode, ~entryFee: int) => {
  let count = Array.length(seeds)
  if count < 2 || count > 4 {
    throw(Invalid_argument("Ludo needs 2 to 4 players"))
  }
  let pot = entryFee > 0 ? entryFee * count : 0
  {
    version: 1,
    mode: mode,
    seed: seed,
    rngCursor: 0,
    players: seeds->Array.map(s => {
      id: s.seedId,
      name: s.seedName,
      color: s.seedColor,
      kind: s.seedIsBot ? Bot : Human,
      tokens: Array.fromInitializer(~length=tokensPerPlayer, mkToken),
      finishedRank: None,
    }),
    turn: 0,
    dice: None,
    phase: AwaitingRoll,
    consecutiveSixes: 0,
    rankings: [],
    entryFee: entryFee,
    prizePool: (Int.toFloat(pot) *. 0.9)->Float.toInt,
    log: [],
    tick: 0,
  }
}

let currentPlayer = s => {
  let idx = s.turn < 0 || s.turn >= Array.length(s.players) ? 0 : s.turn
  switch Array.get(s.players, idx) {
  | Some(p) => p
  | None =>
    switch Array.get(s.players, 0) {
    | Some(p) => p
    | None => throw(Invalid_argument("game has no players"))
    }
  }
}

let playerOfToken = (p, tokenId) => p.tokens->Array.find(t => t.id == tokenId)

// Target progress for a token, or null when the move is illegal.
//
// `option<int>` is unusable here: ReScript encodes `Some(0)` as `undefined`,
// which collides with `None`. Leaving the yard targets progress 0, so a nullable
// int is the correct representation.
let targetProgress = (_p, token, dice, rules) =>
  if token.progress >= home {
    Nullable.null
  } else if token.progress == yard {
    dice == 6 ? Nullable.make(0) : Nullable.null
  } else {
    let next = token.progress + dice
    rules.exactFinish
      ? next <= home
        ? Nullable.make(next)
        : Nullable.null
      : Nullable.make(next > home ? home : next)
  }

let legalTokens = (s, dice, rules) => {
  let p = currentPlayer(s)
  p.tokens->Array.filterMap(t =>
    switch Nullable.toOption(targetProgress(p, t, dice, rules)) {
    | Some(_) => Some(t.id)
    | None => None
    }
  )
}

// Capture counts keyed by player id. A plain Map keeps this JSON-friendly and
// avoids depending on a mutable Dict implementation.
let capturesBy = s => {
  let counts = Map.make()
  s.log->Array.forEach(e =>
    switch e {
    | Move(m) if Array.length(m.captured) > 0 =>
      let previous = switch counts->Map.get(m.playerId) {
  | Some(v) => v
  | None => 0
  }
      counts->Map.set(m.playerId, previous + Array.length(m.captured))
    | _ => ()
    }
  )
  counts
}

let isThreat = (s, abs) =>
  s.players->Array.some(other =>
    other.tokens->Array.some(t => Board.onRing(t.progress) && Board.toAbsolute(other.color, t.progress) == abs)
  )

// Simple but strong bot: finish > capture > leave the yard > advance safely.
let botMove = (s, rules) => {
  let dice = switch s.dice {
  | Some(d) => d
  | None => 0
  }
  let options = legalTokens(s, dice, rules)
  switch options {
  | [] => None
  | [only] => Some(only)
  | _ =>
    let p = currentPlayer(s)
    let scored = options->Array.map(id => {
      let token = switch playerOfToken(p, id) {
      | Some(t) => t
      | None => mkToken(id)
      }
      let to = switch Nullable.toOption(targetProgress(p, token, dice, rules)) {
      | Some(v) => v
      | None => token.progress
      }
      let bonus =
        if to == home {
          1000
        } else if to > ringLast {
          300
        } else if token.progress == yard {
          120
        } else {
          let abs = Board.toAbsolute(p.color, to)
          let risky = !Board.isSafe(abs) && isThreat(s, abs)
          risky ? 250 : Board.isSafe(abs) ? 40 : 0
        }
      (id, to + bonus)
    })
    let best = scored->Array.reduce((0, -1), (acc, x) => Pair.second(x) > Pair.second(acc) ? x : acc)
    Some(Pair.first(best))
  }
}

let pushLog = (s, event) => {
  s.tick = s.tick + 1
  s.log->Array.push(event)
}

// Roll the dice for the player whose turn it is.
let roll = (s, rules) =>
  switch s.phase {
  | AwaitingRoll =>
    let next = clone(s)
    let (value, cursor) = Rng.next(next.seed, next.rngCursor)
    next.rngCursor = cursor
    next.dice = Some(value)
    let player = currentPlayer(next)
    pushLog(next, Roll({playerId: player.id, value: value, at: next.tick}))
    let sixes = value == 6 ? next.consecutiveSixes + 1 : 0
    next.consecutiveSixes = sixes
    if rules.threeSixBust && sixes >= 3 {
      pushLog(next, Pass({playerId: player.id, at: next.tick}))
      next.dice = None
      next.consecutiveSixes = 0
      next.phase = AwaitingRoll
      next.turn = mod(next.turn + 1, Array.length(next.players))
      next
    } else {
      let moves = legalTokens(next, value, rules)
      if Array.length(moves) == 0 {
        pushLog(next, Pass({playerId: player.id, at: next.tick}))
        next.dice = None
        next.consecutiveSixes = 0
        next.phase = AwaitingRoll
        next.turn = mod(next.turn + 1, Array.length(next.players))
        next
      } else {
        next.phase = AwaitingMove
        next
      }
    }
  | _ => s
  }

// Apply a token move. Returns the new state plus the tokens that were captured.
let move = (s, tokenId, rules) =>
  switch (s.phase, s.dice) {
  | (AwaitingMove, Some(dice)) =>
    let player = currentPlayer(s)
    let idx = player.tokens->Array.findIndex(t => t.id == tokenId)
    if idx < 0 {
      (s, [])
    } else {
      let token = player.tokens->Array.getUnsafe(idx)
      switch Nullable.toOption(targetProgress(player, token, dice, rules)) {
      | None => (s, [])
      | Some(to) =>
        let next = clone(s)
        let mover = currentPlayer(next)
        let moving = mover.tokens->Array.getUnsafe(idx)
        let from = moving.progress
        moving.progress = to

        let captured = ref([])
        if Board.onRing(to) && !Board.isSafe(Board.toAbsolute(mover.color, to)) {
          next.players->Array.forEach(other =>
            if other.id != mover.id {
              other.tokens->Array.forEach(t =>
                if Board.onRing(t.progress)
                && Board.toAbsolute(other.color, t.progress) == Board.toAbsolute(mover.color, to) {
                  t.progress = yard
                  captured := [other.id ++ ":" ++ Int.toString(t.id), ...captured.contents]
                }
              )
            }
          )
        }

        pushLog(
          next,
          Move({playerId: mover.id, tokenId: tokenId, from: from, to: to, captured: captured.contents, at: next.tick}),
        )

        let allHome = mover.tokens->Array.every(t => t.progress >= home)
        if to == home && allHome && mover.finishedRank == None {
          mover.finishedRank = Some(Array.length(next.rankings) + 1)
          next.rankings->Array.push(mover.id)
          pushLog(
            next,
            Finish({playerId: mover.id, rank: next.rankings->Array.length, at: next.tick}),
          )
        }

        next.dice = None

        if Array.length(next.rankings) >= 1 {
          // First player home wins; the rest are ranked by distance travelled.
          let done = next.rankings
          let distance = p => p.tokens->Array.reduce(0, (sum, t) => sum + (t.progress > 0 ? t.progress : 0))
          let remaining = next.players->Array.filter((p: player) => !(done->Array.includes(p.id)))
          let ordered = remaining->Array.toSorted((a, b) => Int.toFloat(distance(b) - distance(a)))
          ordered->Array.forEach(p => next.rankings->Array.push(p.id))
          next.phase = Finished
          (next, captured.contents)
        } else {
          next.phase = AwaitingRoll
          let bonus =
            (rules.sixRollsAgain && dice == 6) || (rules.captureRollsAgain && Array.length(captured.contents) > 0)
          if !bonus {
            next.consecutiveSixes = 0
            next.turn = mod(next.turn + 1, Array.length(next.players))
          }
          (next, captured.contents)
        }
      }
    }
  | _ => (s, [])
  }
