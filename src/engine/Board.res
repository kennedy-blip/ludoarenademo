// Static board geometry: the 52-cell ring, safe squares, home columns, yards.
// Everything here is data, so the renderer never re-derives rules.

open Types

let trackLength = 52

let startOffset = color =>
  switch color {
  | Red => 0
  | Green => 13
  | Yellow => 26
  | Blue => 39
  }

// Start squares plus the four star squares.
let safeSquares = [0, 8, 13, 21, 26, 34, 39, 47]

let isSafe = abs => {
  let normalised = mod(abs, trackLength)
  safeSquares->Array.includes(normalised)
}

// Player-relative ring progress -> absolute ring index.
let toAbsolute = (color, progress) => mod(startOffset(color) + progress, trackLength)

// True while a token shares the ring and can capture or be captured.
let onRing = progress => progress >= 0 && progress <= 51

let ringCoords: array<(int, int)> = [
  (6, 13), (6, 12), (6, 11), (6, 10), (6, 9),
  (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8),
  (0, 7), (0, 6),
  (1, 6), (2, 6), (3, 6), (4, 6), (5, 6),
  (6, 5), (6, 4), (6, 3), (6, 2), (6, 1), (6, 0),
  (7, 0), (8, 0),
  (8, 1), (8, 2), (8, 3), (8, 4), (8, 5),
  (9, 6), (10, 6), (11, 6), (12, 6), (13, 6), (14, 6),
  (14, 7), (14, 8),
  (13, 8), (12, 8), (11, 8), (10, 8), (9, 8),
  (8, 9), (8, 10), (8, 11), (8, 12), (8, 13), (8, 14),
  (7, 14), (6, 14),
]

let homeColumn = color =>
  switch color {
  | Red => [(7, 13), (7, 12), (7, 11), (7, 10), (7, 9)]
  | Green => [(1, 7), (2, 7), (3, 7), (4, 7), (5, 7)]
  | Yellow => [(7, 1), (7, 2), (7, 3), (7, 4), (7, 5)]
  | Blue => [(13, 7), (12, 7), (11, 7), (10, 7), (9, 7)]
  }

let yardCoords = color =>
  switch color {
  | Red => [(1, 11), (2, 11), (1, 12), (2, 12)]
  | Green => [(1, 1), (2, 1), (1, 2), (2, 2)]
  | Yellow => [(11, 1), (12, 1), (11, 2), (12, 2)]
  | Blue => [(11, 11), (12, 11), (11, 12), (12, 12)]
  }

// Top-left corner of each 6x6 yard block, used to paint the quadrant.
let yardBlock = color =>
  switch color {
  | Red => (0, 9)
  | Green => (0, 0)
  | Yellow => (9, 0)
  | Blue => (9, 9)
  }

let centerCoord = (7, 7)

// Array indexing returns an option in ReScript 12, so clamp and unwrap once.
let coordAt: (array<(int, int)>, int) => (int, int) = (arr, i) => {
  let len = Array.length(arr)
  let idx = i < 0 || i >= len ? 0 : i
  switch Array.get(arr, idx) {
  | Some(v) => v
  | None => (7, 7)
  }
}

// Where a token is drawn.
let tokenCoord: (color, int, int) => (int, int) = (color, progress, tokenId) =>
  if progress < 0 {
    let yard = yardCoords(color)
    let idx = tokenId < Array.length(yard) ? tokenId : 0
    coordAt(yard, idx)
  } else if progress >= 57 {
    centerCoord
  } else if progress >= 52 {
    let column = homeColumn(color)
    let idx = progress - 52
    let clamped = idx < Array.length(column) ? idx : Array.length(column) - 1
    coordAt(column, clamped)
  } else {
    coordAt(ringCoords, toAbsolute(color, progress))
  }

let colorOrder: array<color> = [Red, Green, Yellow, Blue]

// Deterministic pick of table colours for n seats.
let colorsForCount = n => {
  let count = n < 2 ? 2 : n > 4 ? 4 : n
  Array.fromInitializer(~length=count, i =>
    switch Array.get(colorOrder, i) {
    | Some(c) => c
    | None => Red
    }
  )
}

// Reverse lookup: which ring index draws at this grid cell?
let ringIndexOf = (row, col) => {
  let found = ref(None)
  ringCoords->Array.forEachWithIndex((coord, idx) => {
    let (r, c) = coord
    if r == row && c == col {
      found := Some(idx)
    }
  })
  found.contents
}

// Which player's home column, if any, draws at this grid cell?
let homeColumnAt = (row, col) => {
  let found = ref(None)
  colorOrder->Array.forEach(color =>
    if found.contents == None {
      homeColumn(color)->Array.forEach(coord => {
        let (r, c) = coord
        if r == row && c == col {
          found := Some(color)
        }
      })
    }
  )
  found.contents
}

// True when the cell belongs to a home column rather than the shared ring.
let isHomeColumnCoord = (row, col) =>
  colorOrder->Array.some(color =>
    homeColumn(color)->Array.some(coord => {
      let (r, c) = coord
      r == row && c == col
    })
  )
