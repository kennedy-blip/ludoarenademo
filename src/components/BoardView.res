// The board itself: a 15x15 CSS grid of cells, with the four yards, the 52-cell
// ring, the four home columns and the centre. Token placement comes from
// `Board.tokenCoord`, so what you see is exactly what the engine believes.

open Types

let cellColors = (color: color) =>
  switch color {
  | Red => ("bg-red-500", "bg-red-600 border-red-800", "bg-red-100")
  | Green => ("bg-green-500", "bg-green-600 border-green-800", "bg-green-100")
  | Yellow => ("bg-yellow-400", "bg-yellow-500 border-yellow-700", "bg-yellow-100")
  | Blue => ("bg-blue-500", "bg-blue-600 border-blue-800", "bg-blue-100")
  }

let colorOf = color =>
  switch color {
  | Red => "Red"
  | Green => "Green"
  | Yellow => "Yellow"
  | Blue => "Blue"
  }

let dotOf = color =>
  switch color {
  | Red => "bg-red-500"
  | Green => "bg-green-500"
  | Yellow => "bg-yellow-400"
  | Blue => "bg-blue-500"
  }

// Which quadrant a cell belongs to, if any.
let yardAt = (row, col) =>
  if row <= 5 && col >= 9 {
    Some(Red)
  } else if row <= 5 && col <= 5 {
    Some(Green)
  } else if row >= 9 && col <= 5 {
    Some(Yellow)
  } else if row >= 9 && col >= 9 {
    Some(Blue)
  } else {
    None
  }

let inCenter = (row, col) => row >= 6 && row <= 8 && col >= 6 && col <= 8

// Cell background: yards and centre get their colour, home columns get a tint.
let background = (row, col) => {
  switch yardAt(row, col) {
  | Some(color) =>
    let (bg, _, _) = cellColors(color)
    bg
  | None =>
    if inCenter(row, col) {
      switch (row, col) {
      | (6, 6) | (6, 7) => "bg-green-500"
      | (6, 8) | (7, 8) => "bg-yellow-400"
      | (7, 6) | (8, 6) => "bg-red-500"
      | (8, 7) | (8, 8) => "bg-blue-500"
      | _ => "bg-gray-200"
      }
    } else {
      switch Board.homeColumnAt(row, col) {
      | Some(color) =>
        let (_, _, light) = cellColors(color)
        light
      | None => "bg-white"
      }
    }
  }
}

// Tokens sitting on a cell, in draw order.
let tokensAt = (state: state, row, col) => {
  let found = ref([])
  state.players->Array.forEach(p =>
    p.tokens->Array.forEach(t => {
      let (tr, tc) = Board.tokenCoord(p.color, t.progress, t.id)
      if tr == row && tc == col {
        found := [(p, t), ...found.contents]
      }
    })
  )
  found.contents
}

let isMovable = (state: state, playerId, tokenId) =>
  switch state.phase {
  | AwaitingMove =>
    switch state.dice {
    | Some(dice) =>
      Game.currentPlayer(state).id == playerId
      && Game.legalTokens(state, dice, defaultRules)->Array.includes(tokenId)
    | None => false
    }
  | _ => false
  }

let safeStar = (row, col) =>
  switch Board.ringIndexOf(row, col) {
  | Some(idx) => Board.isSafe(idx) && !Board.isHomeColumnCoord(row, col)
  | None => false
  }

// Plain JS style object; React accepts it directly as the `style` prop.
@react.component
let make = (~state: state, ~onTokenClick: (string, int) => unit) =>
  <div className="bg-amber-100 p-2 rounded-lg shadow-xl">
    <div
      className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-0 border-2 border-gray-800 rounded">
      {React.array(Array.fromInitializer(~length=225, i => {
        let row = i / 15
        let col = mod(i, 15)
        let here = tokensAt(state, row, col)
        let key = Int.toString(row) ++ "-" ++ Int.toString(col)
        let star = safeStar(row, col)
        <div
          key
          className={
            "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 "
            ++ background(row, col)
            ++ " border border-gray-300 relative flex items-center justify-center"
          }>
          {star && Array.length(here) == 0
            ? <span className="text-gray-400 text-[8px]"> {React.string("★")} </span>
            : React.null}
          {React.array(
            here->Array.map(entry => {
            let (player, token) = entry
            let movable = isMovable(state, player.id, token.id)
            let (_, tokenBg, _) = cellColors(player.color)
            <button
              key={player.id ++ "-" ++ Int.toString(token.id)}
              onClick={_ => movable ? onTokenClick(player.id, token.id) : ()}
              disabled={!movable}
              className={
                "absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 shadow-md transition-all duration-200 "
                ++ tokenBg
                ++ " "
                ++ (movable ? " animate-pulse ring-2 ring-white cursor-pointer z-10" : "")
                ++ (token.progress >= home ? " opacity-60" : "")
              }>
              <span className="text-white text-[8px] font-bold">
                {React.string(Int.toString(token.id + 1))}
              </span>
            </button>
            }),
          )}
        </div>
      }))}
    </div>
  </div>
