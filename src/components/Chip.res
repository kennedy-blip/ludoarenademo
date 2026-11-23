// One selectable chip.
@react.component
let make = (~label: string, ~active: bool, ~onClick: unit => unit) =>
  <button
    onClick={_ => onClick()}
    className={
      "px-4 py-2 rounded-lg font-semibold text-sm transition-all "
      ++ (
        active
          ? "bg-amber-400 text-purple-950 shadow-lg scale-105"
          : "bg-white/10 text-white/80 hover:bg-white/20"
      )
    }>
    {React.string(label)}
  </button>

