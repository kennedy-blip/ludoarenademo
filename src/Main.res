// Browser entry point.

// Pull in the Tailwind entry stylesheet. Vite resolves this at build time; the
// shim exists only because CSS cannot be imported from ReScript directly.
@module external styles: unit = "./styles.mjs"
let _ = styles

let rootId = "root"

type doc = {getElementById: string => Nullable.t<Dom.element>}
external documentObj: doc = "document"

let start = () => {
  switch documentObj.getElementById(rootId)->Nullable.toOption {
  | None => ()
  | Some(container) =>
    let root = ReactDOM.Client.createRoot(container)
    root->ReactDOM.Client.Root.render(<React.StrictMode> <App /> </React.StrictMode>)
  }
}

start()
