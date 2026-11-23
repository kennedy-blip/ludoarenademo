// Match verification.
//
// Every match is deterministic: the dice come from `seed` + `rngCursor`, and the
// state carries the full move log. So a finished match can be re-derived from
// nothing but (a) the seated players, (b) the seed and (c) the sequence of token
// ids the players chose. If the replay reproduces the recorded final state, the
// result can be trusted without trusting the server that reported it.
//
// This is what lets a real-money match be audited after the fact.

open Types

// Replay a match from its seed and a list of token choices, one per recorded move.
// Returns the final state, or None if any step is illegal — an illegal step means
// the log was tampered with.
let replay = (seeds, seed: int, mode: mode, entryFee: int, choices: array<int>) => {
  let rules = defaultRules
  let start = Game.create(seeds, ~seed, ~mode, ~entryFee)
  let state = ref(start)
  let failed = ref(false)

  choices->Array.forEach(tokenId => {
    if !failed.contents {
      // Roll until a move is actually required.
      let last = ref(state.contents)
      let guard = ref(0)
      while last.contents.phase == AwaitingRoll && guard.contents < 200 {
        last := Game.roll(last.contents, rules)
        guard := guard.contents + 1
      }
      if last.contents.phase == AwaitingMove {
        let (next, _captured) = Game.move(last.contents, tokenId, rules)
        if next == last.contents {
          // `move` returns the same state for an illegal choice.
          failed := true
        } else {
          state := next
        }
      } else {
        // Match already finished before the choices ran out.
        failed := last.contents.phase != Finished
      }
    }
  })

  failed.contents ? None : Some(state.contents)
}

// Stable fingerprint of a state: everything that decides the outcome, nothing
// that depends on object identity.
let stateHash = (s: state) => {
  let tokenPart = s.players->Array.map(p =>
    p.id
    ++ ":"
    ++ p.tokens->Array.map(t => Int.toString(t.progress))->Array.join(",")
  )->Array.join("|")
  let body =
    Int.toString(s.seed)
    ++ "/"
    ++ Int.toString(s.rngCursor)
    ++ "/"
    ++ (switch s.phase {
      | AwaitingRoll => "AwaitingRoll"
      | AwaitingMove => "AwaitingMove"
      | Finished => "Finished"
      })
    ++ "/"
    ++ tokenPart
    ++ "/"
    ++ s.rankings->Array.join(",")
  Rng.hash(body)
}

// Verify a finished match against its recorded token choices.
// Returns (ok, expectedHash, replayedHash).
let verify = (s: state, choices: array<int>) => {
  let seeds = s.players->Array.map(p => {
    seedId: p.id,
    seedName: p.name,
    seedColor: p.color,
    seedIsBot: p.kind == Bot,
  })
  let expected = stateHash(s)
  switch replay(seeds, s.seed, s.mode, s.entryFee, choices) {
  | None => (false, expected, "")
  | Some(replayed) =>
    let actual = stateHash(replayed)
    (expected == actual, expected, actual)
  }
}
