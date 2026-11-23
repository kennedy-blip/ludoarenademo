// The play screen: board, turn state, dice, and the result overlay.

open Types

@react.component
let make = (
  ~state: state,
  ~balance: int,
  ~onRoll: unit => unit,
  ~onMove: (string, int) => unit,
  ~onExit: unit => unit,
  ~onOpenWallet: unit => unit,
  ~onClaim: int => unit,
  ~claimed: bool,
) => {
  let current = Game.currentPlayer(state)
  let isHuman = current.kind == Human
  let hasRolled = state.dice != None
  let canRoll = isHuman && !hasRolled && state.phase == AwaitingRoll
  let legal =
    switch (state.phase, state.dice) {
    | (AwaitingMove, Some(d)) => Game.legalTokens(state, d, defaultRules)
    | _ => []
    }
  let stuck = isHuman && hasRolled && Array.length(legal) == 0
  let winner =
    switch state.rankings->Array.get(0) {
    | Some(firstId) => state.players->Array.find(p => p.id == firstId)
    | None => None
    }
  let wonByHuman =
    switch winner {
    | Some(p) => p.kind == Human
    | None => false
    }

  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
    <div className="bg-black/20 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={_ => onExit()} className="text-white/70 hover:text-white text-sm">
            {React.string("← Exit")}
          </button>
          <span className="text-white font-bold">
            {React.string(state.mode == Free ? "🎮 Free Mode" : "🔥 Beast Mode")}
          </span>
        </div>
        {state.mode == Beast
          ? <div className="text-center">
              <div className="text-xs text-white/70"> {React.string("Prize Pool")} </div>
              <div className="text-lg font-bold text-green-400">
                {React.string("KES " ++ Int.toString(state.prizePool))}
              </div>
            </div>
          : React.null}
        <button
          onClick={_ => onOpenWallet()}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm">
          {React.string("💰 KES " ++ Int.toString(balance))}
        </button>
      </div>
    </div>

    <div className="max-w-6xl mx-auto px-4 py-4">
      // Player strip
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {React.array(
          state.players->Array.mapWithIndex((p, idx) => {
            let (_, tokenBg, _) = BoardView.cellColors(p.color)
            let isTurn = idx == state.turn
            <div
              key={p.id}
              className={
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm "
                ++ (isTurn ? "bg-white/20 ring-2 ring-amber-300 text-white" : "bg-white/5 text-white/60")
              }>
              <span className={"w-3 h-3 rounded-full " ++ tokenBg} />
              <span className="font-medium"> {React.string(p.name)} </span>
              {p.kind == Bot ? <span className="text-xs"> {React.string("🤖")} </span> : React.null}
              {p.finishedRank != None
                ? <span className="text-xs text-amber-300"> {React.string("🏁")} </span>
                : React.null}
            </div>
          }),
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
        <div className="flex-shrink-0">
          <BoardView state onTokenClick={onMove} />
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white min-w-[250px]">
          <div className="text-center mb-5">
            <div className="text-sm text-white/70 mb-1"> {React.string("Current Turn")} </div>
            <div className="text-xl font-bold flex items-center justify-center gap-2">
              <span className={"w-4 h-4 rounded-full " ++ BoardView.dotOf(current.color)} />
              {React.string(current.name)}
              {current.kind == Bot ? React.string(" 🤖") : React.null}
            </div>
          </div>

          <div className="flex justify-center mb-5">
            <div
              className={
                "w-16 h-16 rounded-2xl bg-white text-purple-900 flex items-center justify-center text-3xl font-black shadow-lg "
                ++ (state.phase == AwaitingRoll ? " animate-pulse" : "")
              }>
              {switch state.dice {
              | Some(d) => React.string(Int.toString(d))
              | None => React.string("?")
              }}
            </div>
          </div>

          <button
            onClick={_ => canRoll ? onRoll() : ()}
            disabled={!canRoll}
            className={
              "w-full py-3 rounded-xl font-bold transition-colors "
              ++ (
                canRoll
                  ? "bg-amber-400 hover:bg-amber-300 text-purple-950"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              )
            }>
            {React.string(
              state.phase == Finished
                ? "Match over"
                : hasRolled
                ? "Pick a token"
                : isHuman
                ? "Roll Dice"
                : "Bot is playing…",
            )}
          </button>

          <div className="text-center text-sm text-white/60 mt-3 h-10">
            {React.string(
              stuck
                ? "No legal move — passing"
                : isHuman && !hasRolled
                ? "Roll the dice to begin"
                : hasRolled && isHuman
                ? "Tap a pulsing token"
                : isHuman
                ? ""
                : "Waiting on " ++ current.name,
            )}
          </div>

          {state.consecutiveSixes > 0
            ? <div className="mt-2 text-center text-yellow-400 text-sm">
                {React.string("⚠️ Consecutive 6s: " ++ Int.toString(state.consecutiveSixes) ++ "/3")}
              </div>
            : React.null}
        </div>
      </div>
    </div>

    {switch winner {
    | None => React.null
    | Some(w) =>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4"> {React.string("🏆")} </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {React.string(w.kind == Human ? "You Win!" : "Bot Wins!")}
          </h2>
          <p className="text-white/90 text-lg mb-4">
            {React.string(w.name ++ " is the champion!")}
          </p>
          {state.mode == Beast
            ? <div className="bg-black/20 rounded-xl p-4 mb-6">
                {wonByHuman
                  ? <>
                      <div className="text-white/70 text-sm"> {React.string("Prize Won")} </div>
                      <div className="text-3xl font-bold text-white">
                        {React.string("KES " ++ Int.toString(state.prizePool))}
                      </div>
                      {claimed
                        ? <p className="text-green-300 mt-2"> {React.string("✓ Prize added to wallet!")} </p>
                        : <button
                            onClick={_ => onClaim(state.prizePool)}
                            className="mt-3 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold">
                            {React.string("💰 Claim Prize")}
                          </button>}
                    </>
                  : <p className="text-white"> {React.string("Better luck next time!")} </p>}
              </div>
            : React.null}
          <button
            onClick={_ => onExit()}
            className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">
            {React.string("Back to Lobby")}
          </button>
        </div>
      </div>
    }}
  </div>
}
