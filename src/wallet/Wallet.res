// Wallet: balance in integer cents, persisted to localStorage.
//
// Money never touches a float. Deposits, entry fees and prizes are all whole
// cents, so `1.1 + 2.2` style drift cannot leak into a payout.

type txnKind = Deposit | Withdrawal | EntryFee | Winnings | DemoCredit | DailyBonus

type txn = {
  id: string,
  kind: txnKind,
  amount: int, // signed, in cents
  label: string,
  at: int, // epoch millis
}

type wallet = {
  mutable balance: int,
  mutable transactions: array<txn>,
  mutable phone: string,
  mutable lastBonusDay: int,
}

let storageKey = "ludo_wallet_v2"

// Minimal localStorage bindings — no extra dependency needed.
type storage
external storage: storage = "localStorage"
@send external setItem: (storage, string, string) => unit = "setItem"
@send external readItem: (storage, string) => option<string> = "getItem"

let kindName = k =>
  switch k {
  | Deposit => "Deposit"
  | Withdrawal => "Withdrawal"
  | EntryFee => "Entry fee"
  | Winnings => "Winnings"
  | DemoCredit => "Practice credit"
  | DailyBonus => "Daily bonus"
  }

let kindOf = s =>
  switch s {
  | "Deposit" => Deposit
  | "Withdrawal" => Withdrawal
  | "EntryFee" => EntryFee
  | "Winnings" => Winnings
  | "DemoCredit" => DemoCredit
  | _ => DailyBonus
  }

let now = () => Date.now()->Float.toInt

let empty = (): wallet => {
  balance: 0,
  transactions: [],
  phone: "",
  lastBonusDay: 0,
}

// Parse a persisted wallet. Any malformed field falls back to a safe default
// rather than throwing — a corrupted balance must never brick the app.
let field = (obj, key) => obj->Dict.get(key)

let fieldString = (obj, key) =>
  switch field(obj, key)->Option.flatMap(JSON.Decode.string) {
  | Some(v) => v
  | None => ""
  }

// Numbers were written as JSON ints, which decode as floats.
let fieldInt = (obj, key, fallback) =>
  switch field(obj, key) {
  | Some(v) =>
    switch JSON.Decode.float(v) {
    | Some(f) => f->Float.toInt
    | None => fallback
    }
  | None => fallback
  }

let parseTxn = t =>
  switch JSON.Decode.object(t) {
  | None => None
  | Some(o) =>
    Some({
      id: fieldString(o, "id"),
      kind: kindOf(fieldString(o, "kind")),
      amount: fieldInt(o, "amount", 0),
      label: fieldString(o, "label"),
      at: fieldInt(o, "at", 0),
    })
  }

let parse = json => {
  let w = empty()
  switch JSON.Decode.object(json) {
  | None => ()
  | Some(o) =>
    w.balance = fieldInt(o, "balance", 0)
    w.phone = fieldString(o, "phone")
    w.lastBonusDay = fieldInt(o, "lastBonusDay", 0)
    w.transactions = switch field(o, "transactions")->Option.flatMap(JSON.Decode.array) {
    | Some(items) => items->Array.filterMap(parseTxn)
    | None => []
    }
  }
  w
}

// Storage is best-effort: private browsing or a full quota must not crash a match.
let save = w => {
  let encoded = JSON.Encode.object(
    Dict.fromArray([
      ("balance", JSON.Encode.int(w.balance)),
      ("phone", JSON.Encode.string(w.phone)),
      ("lastBonusDay", JSON.Encode.int(w.lastBonusDay)),
      (
        "transactions",
        JSON.Encode.array(
          w.transactions->Array.map(t =>
            JSON.Encode.object(
              Dict.fromArray([
                ("id", JSON.Encode.string(t.id)),
                ("kind", JSON.Encode.string(kindName(t.kind))),
                ("amount", JSON.Encode.int(t.amount)),
                ("label", JSON.Encode.string(t.label)),
                ("at", JSON.Encode.int(t.at)),
              ]),
            )
          ),
        ),
      ),
    ]),
  )
  try {
    setItem(storage, storageKey, JSON.stringify(encoded))
  } catch {
  | _ => ()
  }
}

let load = () =>
  switch readItem(storage, storageKey) {
  | exception _ => empty()
  | None => empty()
  | Some(raw) =>
    switch JSON.parseOrThrow(raw) {
    | exception _ => empty()
    | parsed => parse(parsed)
    }
  }

let record = (w, kind, amount, label) => {
  let t = {id: "t_" ++ Int.toString(now()) ++ "_" ++ Int.toString(Array.length(w.transactions)), kind, amount, label: label, at: now()}
  w.transactions = [t, ...w.transactions]
  save(w)
  t
}

let credit = (w, kind, amount, label) => {
  w.balance = w.balance + amount
  record(w, kind, amount, label)->ignore
  w.balance
}

// Debit that refuses to overdraw.
let debit = (w, kind, amount, label) =>
  if amount > w.balance {
    false
  } else {
    w.balance = w.balance - amount
    record(w, kind, -amount, label)->ignore
    true
  }

// One daily bonus per calendar day, 20..100 KES scaled by play streak length.
let depositBonus = w => {
  let today = mod(now() / 86400000, 100000)
  if w.lastBonusDay == today {
    (0, w.balance)
  } else {
    let streak = today - w.lastBonusDay
    let amount = streak <= 1 ? 100 : 50
    w.lastBonusDay = today
    (amount, credit(w, DailyBonus, amount * 100, "Daily bonus"))
  }
}

let addDemoCredits = w => credit(w, DemoCredit, 100000, "Practice balance")->ignore

// Presentation helpers (amounts are cents).
let toKes = cents => Float.toInt(Float.fromInt(cents) /. 100.0)

let format = cents => {
  let whole = cents / 100
  let frac = mod(abs(cents), 100)
  let sign = cents < 0 ? "-" : ""
  sign ++ Int.toString(abs(whole)) ++ "." ++ (frac < 10 ? "0" : "") ++ Int.toString(frac)
}
