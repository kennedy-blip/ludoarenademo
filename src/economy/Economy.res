// Progression and economy rules.
//
// These are money rules, so they live in one auditable place and are covered by
// tests. Everything is integer KES except rating maths, which is genuinely
// fractional (Elo).

// --- Math externals ----------------------------------------------------------
// @rescript/core does not ship rounding or pow, and these must match the
// JavaScript semantics the original TypeScript used exactly.
@val external mathRound: float => float = "Math.round"
@val external mathPow: (float, float) => float = "Math.pow"

// --- Economy constants -------------------------------------------------------

let platformRake = 0.1
let minDeposit = 10
let minWithdrawal = 50
let dailyBonusBase = 20
let dailyBonusStep = 10
let dailyBonusMax = 100
let entryFees: array<int> = [50, 100, 250, 500, 1000, 2500]

// Winner's share of the pot: 90% of entryFee * players.
let prizePoolFor = (entryFee, players) => {
  let total = Float.fromInt(entryFee * players) *. (1.0 -. platformRake)
  Float.toInt(mathRound(total))
}

// Streak-aware daily bonus: 20, 30, 40 ... capped at 100. A missed day resets
// the streak back to 1.
let dailyBonus = streak => {
  let clamped = streak < 1 ? 1 : streak > 10 ? 10 : streak
  let amount = dailyBonusBase + (clamped - 1) * dailyBonusStep
  amount > dailyBonusMax ? dailyBonusMax : amount
}

// Whole days between two day-numbers (UTC day indices).
let dayDiff = (todayDay, lastDay) => todayDay - lastDay

// (streak, amount, claimed)
let nextStreak = (currentStreak, todayDay, lastClaimDay) =>
  if lastClaimDay == None {
    (1, dailyBonus(1), true)
  } else {
    switch lastClaimDay {
    | None => (1, dailyBonus(1), true)
    | Some(last) =>
      let days = dayDiff(todayDay, last)
      if days <= 0 {
        (currentStreak, 0, false)
      } else {
        let streak = days == 1 ? currentStreak + 1 : 1
        (streak, dailyBonus(streak), true)
      }
    }
  }

// Weekly tournament points: placement plus a small skill bonus, doubled in
// Beast mode.
let tournamentPoints = (placement, fieldSize, captured, beast) => {
  let base = (fieldSize - placement + 1) * 10
  let baseClamped = base < 0 ? 0 : base
  let captureBonus = (captured > 8 ? 8 : captured) * 2
  let multiplier = beast ? 2 : 1
  (baseClamped + captureBonus) * multiplier
}

// --- Rating ------------------------------------------------------------------

// Elo tuned for casual Ludo: small K, bot damping, no inflation.
let kWin = 32
let kLoss = 16
let botDamp = 0.35
let floorRating = 100

let expectedScore = (rating, opponentRating) => {
  let diff = Float.fromInt(opponentRating - rating) /. 400.0
  1.0 /. (1.0 +. mathPow(10.0, diff))
}

// (rating, delta)
let applyRating = (rating, placement, fieldSize, opponentsAvg, vsBot) => {
  let expected = expectedScore(rating, opponentsAvg)
  let actual =
    fieldSize > 1 ? Float.fromInt(fieldSize - placement) /. Float.fromInt(fieldSize - 1) : 1.0
  let k = placement == 1 ? kWin : kLoss
  let damp = vsBot ? botDamp : 1.0
  let delta = Float.toInt(mathRound(Float.fromInt(k) *. (actual -. expected) *. damp))
  let next = rating + delta
  (next < floorRating ? floorRating : next, delta)
}

type rank = {id: string, name: string, minRating: int, emoji: string}

let ranks: array<rank> = [
  {id: "mwanzo", name: "Mwanzo", minRating: 0, emoji: "🌱"},
  {id: "shujaa", name: "Shujaa", minRating: 1100, emoji: "🛡️"},
  {id: "simba", name: "Simba", minRating: 1250, emoji: "🦁"},
  {id: "mfalme", name: "Mfalme", minRating: 1400, emoji: "👑"},
  {id: "legend", name: "Legend", minRating: 1600, emoji: "🔥"},
]

let rankFor = rating => {
  let current = ref(ranks->Array.getUnsafe(0))
  ranks->Array.forEach(r =>
    if rating >= r.minRating {
      current := r
    }
  )
  current.contents
}

let nextRank = rating => ranks->Array.find(r => r.minRating > rating)

// Progress (0..1) toward the next rank, for the profile meter.
let rankProgress = rating =>
  switch nextRank(rating) {
  | None => 1.0
  | Some(next) =>
    let current = rankFor(rating)
    let span = next.minRating - current.minRating
    span <= 0
      ? 1.0
      : {
          let p = Float.fromInt(rating - current.minRating) /. Float.fromInt(span)
          p < 0.0 ? 0.0 : p > 1.0 ? 1.0 : p
        }
  }
