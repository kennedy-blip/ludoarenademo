// Lobby: pick a mode, an entry fee and a table size, then start a match.

open Types

let entryFees = [50, 100, 250, 500, 1000, 2500]

let fmt = n => Int.toString(n)

let kes = n => {
  // Thousands separators, built from the digits.
  let raw = Int.toString(n)
  let len = String.length(raw)
  let out = ref("")
  for i in 0 to len - 1 {
    let fromEnd = len - i
    out := out.contents ++ String.charAt(raw, i)
    if mod(fromEnd, 3) == 1 && fromEnd > 1 {
      out := out.contents ++ ","
    }
  }
  out.contents
}

@react.component
let make = (
  ~balance: int,
  ~onStart: (mode, int, int) => unit,
  ~onOpenWallet: unit => unit,
) => {
  let mode = React.useState(() => None)
  let entryFee = React.useState(() => 100)
  let playerCount = React.useState(() => 4)

  let (selected, setSelected) = mode
  let (fee, setFee) = entryFee
  let (seats, setSeats) = playerCount

  let prize = fee * seats * 9 / 10
  let affordable = balance >= fee

  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
    <div className="bg-black/20 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {React.string("🎲 Ludo Arena")}
        </h1>
        <button
          onClick={_ => onOpenWallet()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <span className="text-lg"> {React.string("💰")} </span>
          <span className="font-bold"> {React.string("KES " ++ kes(balance))} </span>
        </button>
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
          {React.string("Play Ludo, Win Big! 🏆")}
        </h2>
        <p className="text-lg text-white/70">
          {React.string("Choose your mode and compete against smart bots")}
        </p>
      </div>

      {switch selected {
      | None =>
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={_ => setSelected(_ => Some(Free))}
            className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl text-white text-left hover:scale-105 transition-transform shadow-xl">
            <div className="text-4xl mb-4"> {React.string("🎮")} </div>
            <h3 className="text-2xl font-bold mb-2"> {React.string("Free Mode")} </h3>
            <p className="text-white/80 mb-4">
              {React.string("Practice your skills and play for fun. No money, no pressure!")}
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              <li> {React.string("✓ Play against AI bots")} </li>
              <li> {React.string("✓ No entry fee required")} </li>
              <li> {React.string("✓ Unlimited games")} </li>
            </ul>
          </button>

          <button
            onClick={_ => setSelected(_ => Some(Beast))}
            className="bg-gradient-to-br from-orange-500 to-red-700 p-6 rounded-2xl text-white text-left hover:scale-105 transition-transform shadow-xl">
            <div className="text-4xl mb-4"> {React.string("🔥")} </div>
            <h3 className="text-2xl font-bold mb-2"> {React.string("Beast Mode")} </h3>
            <p className="text-white/80 mb-4">
              {React.string("Stake KES, beat the bots, take the pool. 10% platform fee.")}
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              <li> {React.string("✓ Real KES entry fee")} </li>
              <li> {React.string("✓ 90% of the pool to the winner")} </li>
              <li> {React.string("✓ Every match is verifiable")} </li>
            </ul>
          </button>
        </div>
      | Some(m) =>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">
              {React.string(m == Free ? "🎮 Free Mode" : "🔥 Beast Mode")}
            </h3>
            <button
              onClick={_ => setSelected(_ => None)}
              className="text-white/60 hover:text-white text-sm">
              {React.string("← Change")}
            </button>
          </div>

          {m == Beast
            ? <div className="mb-6">
                <div className="text-sm text-white/70 mb-2"> {React.string("Entry fee")} </div>
                <div className="flex flex-wrap gap-2">
                  {React.array(
                    entryFees->Array.map(f =>
                      <Chip
                        key={Int.toString(f)}
                        label={"KES " ++ fmt(f)}
                        active={f == fee}
                        onClick={() => setFee(_ => f)}
                      />
                    ),
                  )}
                </div>
              </div>
            : React.null}

          <div className="mb-6">
            <div className="text-sm text-white/70 mb-2"> {React.string("Players")} </div>
            <div className="flex gap-2">
              {React.array(
                [2, 3, 4]->Array.map(n =>
                  <Chip
                    key={Int.toString(n)}
                    label={Int.toString(n)}
                    active={n == seats}
                    onClick={() => setSeats(_ => n)}
                  />
                ),
              )}
            </div>
          </div>

          {m == Beast
            ? <div className="bg-black/20 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm text-white/70 mb-1">
                  <span> {React.string("Prize pool")} </span>
                  <span> {React.string("KES " ++ kes(fee * seats))} </span>
                </div>
                <div className="flex justify-between text-sm text-white/70 mb-1">
                  <span> {React.string("Platform fee (10%)")} </span>
                  <span> {React.string("KES " ++ kes(fee * seats / 10))} </span>
                </div>
                <div className="flex justify-between font-bold text-green-400 pt-2 border-t border-white/10">
                  <span> {React.string("Winner takes")} </span>
                  <span> {React.string("KES " ++ kes(prize))} </span>
                </div>
              </div>
            : React.null}

          {m == Beast && !affordable
            ? <div className="bg-red-500/20 border border-red-400/40 rounded-lg p-3 mb-4 text-sm text-red-200">
                {React.string("Not enough balance. Top up your wallet to play.")}
              </div>
            : React.null}

          <button
            onClick={_ =>
              if m == Free || affordable {
                onStart(m, m == Free ? 0 : fee, seats)
              } else {
                onOpenWallet()
              }
            }
            className="w-full bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold py-3 rounded-xl transition-colors">
            {React.string(m == Free ? "Play Free →" : "Play for Cash →")}
          </button>
        </div>
      }}
    </div>
  </div>
}
