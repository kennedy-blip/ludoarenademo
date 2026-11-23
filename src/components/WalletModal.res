// Wallet sheet: balance, top-up, cash out, and the transaction ledger.

open Wallet

@react.component
let make = (
  ~wallet: wallet,
  ~open_: bool,
  ~onClose: unit => unit,
  ~onDeposit: (int, string) => bool,
  ~onWithdraw: (int, string) => bool,
  ~onDemo: unit => unit,
) => {
  let amount = React.useState(() => "100")
  let phone = React.useState(() => wallet.phone)
  let message = React.useState(() => None)
  let (amt, setAmt) = amount
  let (ph, setPh) = phone
  let (msg, setMsg) = message

  let kesOf = s =>
    switch Int.fromString(String.trim(s)) {
    | Some(v) => v
    | None => 0
    }

  if !open_ {
    React.null
  } else {
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-800 to-indigo-900 rounded-2xl p-6 w-full max-w-md text-white shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold"> {React.string("💰 Wallet")} </h3>
          <button onClick={_ => onClose()} className="text-white/60 hover:text-white">
            {React.string("✕")}
          </button>
        </div>

        <div className="bg-black/20 rounded-xl p-4 mb-5 text-center">
          <div className="text-xs text-white/60"> {React.string("Balance")} </div>
          <div className="text-3xl font-bold"> {React.string("KES " ++ format(wallet.balance))} </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-white/60 block mb-1"> {React.string("Amount (KES)")} </label>
          <input
            value=amt
            onChange={e => setAmt(_ => ReactEvent.Form.target(e)["value"])}
            inputMode="numeric"
            className="w-full bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/60 block mb-1"> {React.string("M-Pesa number")} </label>
          <input
            value=ph
            onChange={e => setPh(_ => ReactEvent.Form.target(e)["value"])}
            placeholder="07XXXXXXXX"
            className="w-full bg-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {switch msg {
        | Some((ok, text)) =>
          <div
            className={
              "text-sm rounded-lg px-3 py-2 mb-3 "
              ++ (ok ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200")
            }>
            {React.string(text)}
          </div>
        | None => React.null
        }}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={_ => {
              let kes = kesOf(amt)
              let ok = onDeposit(kes * 100, ph)
              setMsg(_ =>
                Some((
                  ok,
                  ok ? "Deposit added to your wallet." : "Check the amount and phone number.",
                ))
              )
            }}
            className="bg-green-600 hover:bg-green-500 font-semibold py-2.5 rounded-lg">
            {React.string("Top up")}
          </button>
          <button
            onClick={_ => {
              let kes = kesOf(amt)
              let ok = onWithdraw(kes * 100, ph)
              setMsg(_ =>
                Some((
                  ok,
                  ok ? "Cash-out requested." : "Not enough balance for that cash-out.",
                ))
              )
            }}
            className="bg-amber-500 hover:bg-amber-400 text-purple-950 font-semibold py-2.5 rounded-lg">
            {React.string("Cash out")}
          </button>
        </div>

        <button
          onClick={_ => {
            onDemo()
            setMsg(_ => Some((true, "Practice credits added — these are not real money.")))
          }}
          className="w-full mt-3 bg-white/10 hover:bg-white/20 text-sm py-2 rounded-lg text-white/70">
          {React.string("Add practice credits")}
        </button>

        {Array.length(wallet.transactions) > 0
          ? <div className="mt-5">
              <div className="text-xs text-white/60 mb-2"> {React.string("Recent activity")} </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {React.array(
                  wallet.transactions->Array.slice(~start=0, ~end=8)->Array.map(t =>
                    <div
                      key={t.id}
                      className="flex justify-between text-xs bg-white/5 rounded px-2 py-1.5">
                      <span className="text-white/70"> {React.string(kindName(t.kind))} </span>
                      <span className={t.amount >= 0 ? "text-green-300" : "text-red-300"}>
                        {React.string((t.amount >= 0 ? "+" : "") ++ format(t.amount))}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          : React.null}
      </div>
    </div>
  }
}
