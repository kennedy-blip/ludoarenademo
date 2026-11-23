// Deterministic PRNG + FNV-1a hashing.
//
// A match stores only `seed` and `rngCursor`, so the server can recompute every
// dice value a client reports and verify a finished match by replaying its log.
//
// ReScript 12 compiles `a * b` to `(a * b | 0)`, `+` to wrapping 32-bit add and
// `>>>` to an unsigned shift, which matches sfc32/mulberry32 bit-for-bit.

@val external mathRandom: unit => float = "Math.random"

let band = Int.bitwiseAnd
let bor = Int.bitwiseOr
let bxor = Int.bitwiseXor
let shr = Int.shiftRightUnsigned

// 32-bit multiply, matching JS `Math.imul` exactly.
//
// ReScript's `*` wraps at 32 bits, but relying on it here is fragile: the whole
// point of this module is to stay bit-identical to the original TypeScript
// mulberry32, so every step is spelled out.
let imul = (a, b) => {
  let ah = band(shr(a, 16), 0xffff)
  let al = band(a, 0xffff)
  let bh = band(shr(b, 16), 0xffff)
  let bl = band(b, 0xffff)
  let low = al * bl
  let mid = band(al * bh + ah * bl, 0xffff)
  low + mid * 65536
}

// The mulberry32 mix, operation for operation:
//
//   t = imul(t ^ (t >>> 15), t | 1)
//   t ^= t + imul(t ^ (t >>> 7), t | 61)
//   unit = (t ^ (t >>> 14)) >>> 0 / 2^32
let mix = t => {
  let a = imul(bxor(t, shr(t, 15)), bor(t, 1))
  // Note the multiplier here is `t | 61`, not the constant 61.
  let b = bxor(a, a + imul(bxor(a, shr(a, 7)), bor(a, 61)))
  bxor(b, shr(b, 14))
}

// Uniform float in [0, 1) for a given (seed, cursor).
let unitAt = (seed, cursor) => {
  //   t = (seed + imul(cursor + 1, 0x6d2b79f5)) >>> 0
  let start = seed + imul(cursor + 1, 0x6d2b79f5)
  let mixed = mix(start)
  // Widen to float BEFORE fixing the sign: a 32-bit int cannot hold 2^32, so
  // `x < 0 ? x + 4294967296 : x` would wrap straight back to x.
  let widened = Int.toFloat(mixed)
  let unsigned = widened < 0.0 ? widened +. 4294967296.0 : widened
  unsigned /. 4294967296.0
}

// Stateless step: (face, nextCursor). Rolls are 1..6 inclusive.
let next = (seed, cursor) => {
  let value = unitAt(seed, cursor)
  let raw = 1 + (value *. 6.0)->Float.toInt
  let face = raw > 6 ? 6 : raw < 1 ? 1 : raw
  (face, cursor + 1)
}

// FNV-1a over a string, as an 8-char lowercase hex digest.
let hash = input => {
  let h = ref(0x811c9dc5)
  let len = String.length(input)
  for i in 0 to len - 1 {
    let byte = switch String.charCodeAt(input, i) {
    | Some(code) => code->Int.toFloat->Float.toInt
    | None => 0
    }
    h := bxor(h.contents, byte) * 0x01000193
  }
  let out = ref("")
  let value = ref(h.contents)
  for _ in 0 to 7 {
    let digit = band(value.contents, 0xf)
    out := String.concat(
      String.fromCharCode(digit < 10 ? digit + 48 : digit + 87),
      out.contents,
    )
    value := shr(value.contents, 4)
  }
  out.contents
}

let randomSeed = () => (mathRandom() *. 4294967295.0)->Float.toInt
