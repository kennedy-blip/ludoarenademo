// Application root: owns the wallet, the current match, and the bot driver.

open Types

type screen = LobbyScreen | GameScreen_

// Seat names/colours come from `Board.colorsForCount`, so the same code seats a
// 2-, 3- or 4-handed table.
let seatPlayers = count =>
  Board.colorsForCount(count)->Array.mapWithIndex((color, i) => {
    seedId: i == 0 ? "p1" : "p" ++ Int.toString(i + 1),
    seedName: i == 0 ? "You" : "Bot " ++ Int.toString(i),
    seedColor: color,
    seedIsBot: i != 0,
  })

@react.component
let make = () => {
  let walletState = React.useState(() => Wallet.load())
  let screenState = React.useState(() => LobbyScreen)
  let matchState = React.useState(() => None)
  let walletOpen = React.useState(() => false)
  let claimedState = React.useState(() => false)

  let (wallet, _setWallet) = walletState
  let (screen, setScreen) = screenState
  let (match, setMatch) = matchState
  let (walletOpen_, setWalletOpen) = walletOpen
  let (claimed, setClaimed) = claimedState

  // The wallet is a mutable record; bump a counter so React re-renders.
  let walletVersion = React.useState(() => 0)
  let (_, bumpWallet) = walletVersion
  let touchWallet = () => {
    Wallet.save(wallet)
    bumpWallet(v => v + 1)
  }

  let current: option<state> = match

  // Bot driver: when it is a bot's turn, roll and pick a move after a short pause.
  React.useEffect(() => {
    switch current {
    | None => None
    | Some(s0) =>
      if s0.phase != Finished {
        let p = Game.currentPlayer(s0)
        if p.kind == Bot {
          let timer = setTimeout(() => {
            switch s0.phase {
            | AwaitingRoll =>
              let rolled = Game.roll(s0, defaultRules)
              setMatch(_ => Some(rolled))
            | AwaitingMove =>
              switch Game.botMove(s0, defaultRules) {
              | Some(tokenId) =>
                let (next, _) = Game.move(s0, tokenId, defaultRules)
                setMatch(_ => Some(next))
              | None => setMatch(_ => Some(s0))
              }
            | Finished => ()
            }
          }, 620)
          Some(() => clearTimeout(timer))
        } else {
          None
        }
      } else {
        None
      }
    }
  }, [match])

  // If the human's roll produced no legal move, pass automatically.
  React.useEffect(() => {
    switch current {
    | Some(s0) =>
      if s0.phase == AwaitingMove {
        switch (s0.dice, Game.currentPlayer(s0).kind) {
        | (Some(d), Human) =>
          if Array.length(Game.legalTokens(s0, d, defaultRules)) == 0 {
            // Re-roll on the same turn: the engine already advanced the turn
            // during `roll`, so just clear the pending dice.
            let cleaned = Game.clone(s0)
            cleaned.dice = None
            cleaned.phase = AwaitingRoll
            setMatch(_ => Some(cleaned))
          }
        | _ => ()
        }
      }
      None
    | None => None
    }
  }, [match])

  let start = (mode, entryFeeKes, seats) => {
    let canPlay =
      if mode == Beast {
        Wallet.debit(wallet, EntryFee, entryFeeKes * 100, "Entry fee")
      } else {
        true
      }
    if !canPlay {
      setWalletOpen(_ => true)
    } else {
      Wallet.depositBonus(wallet)->ignore
      touchWallet()

      let seed = Rng.randomSeed()
      let g = Game.create(seatPlayers(seats), ~seed, ~mode, ~entryFee=entryFeeKes * 100)
      setMatch(_ => Some(g))
      setScreen(_ => GameScreen_)
      setClaimed(_ => false)
    }
  }

  let exitToLobby = () => {
    setMatch(_ => None)
    setScreen(_ => LobbyScreen)
    setClaimed(_ => false)
  }

  let roll = () =>
    switch current {
    | Some(s0) => setMatch(_ => Some(Game.roll(s0, defaultRules)))
    | None => ()
    }

  let move = (playerId, tokenId) =>
    switch current {
    | Some(s0) =>
      if Game.currentPlayer(s0).id == playerId {
        let (next, _) = Game.move(s0, tokenId, defaultRules)
        setMatch(_ => Some(next))
      }
    | None => ()
    }

  let claim = amount => {
    Wallet.credit(wallet, Winnings, amount, "Match prize")->ignore
    touchWallet()
    setClaimed(_ => true)
  }

  let deposit = (cents, _phone) =>
    if cents < 1000 {
      false
    } else {
      Wallet.credit(wallet, Deposit, cents, "M-Pesa top-up")->ignore
      touchWallet()
      true
    }

  let withdraw = (cents, _phone) => {
    let ok = Wallet.debit(wallet, Withdrawal, cents, "M-Pesa cash-out")
    if ok {
      touchWallet()
    }
    ok
  }

  let demo = () => {
    Wallet.addDemoCredits(wallet)
    touchWallet()
  }

  switch screen {
  | LobbyScreen =>
    <div>
      <Lobby
        balance={Wallet.toKes(wallet.balance)}
        onStart={start}
        onOpenWallet={() => setWalletOpen(_ => true)}
      />
      <WalletModal
        wallet
        open_={walletOpen_}
        onClose={() => setWalletOpen(_ => false)}
        onDeposit={deposit}
        onWithdraw={withdraw}
        onDemo={demo}
      />
    </div>
  | GameScreen_ =>
    switch current {
    | None =>
      <div className="min-h-screen bg-purple-900 text-white flex items-center justify-center">
        {React.string("No match in progress.")}
      </div>
    | Some(s) =>
      <GameScreen
        state={s}
        balance={Wallet.toKes(wallet.balance)}
        onRoll={roll}
        onMove={move}
        onExit={exitToLobby}
        onOpenWallet={() => setWalletOpen(_ => true)}
        onClaim={claim}
        claimed
      />
    }
  }
}
