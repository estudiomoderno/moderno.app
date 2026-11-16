"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

type EmojiPickerContextValue = {
  value: string | null
  onValueChange: (value: string) => void
}

const EmojiPickerContext = React.createContext<EmojiPickerContextValue | null>(null)

const GROUPS = [
  { label: "Caras", emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😎","🤓","🤔","🫡","🤗","🤭","🫢","😴","🥳"] },
  { label: "Gestos", emojis: ["👍","👎","👌","✌️","🤞","🤟","🤘","👏","🙌","🫶","🙏","💪","👀","❤️","🧡","💛","💚","💙","💜","🖤"] },
  { label: "Objetos", emojis: ["✨","🔥","🎉","✅","📌","📎","📐","📅","💼","💡","🚀","🏠","🛋️","🌿","☕","📣","🧱","🪴","🔑","🛠️"] },
]

export function EmojiPicker({ value, onValueChange, children }: React.PropsWithChildren<EmojiPickerContextValue>) {
  return <EmojiPickerContext.Provider value={{ value, onValueChange }}>{children}</EmojiPickerContext.Provider>
}

export function EmojiPickerPanel() {
  const picker = React.useContext(EmojiPickerContext)
  const [query, setQuery] = React.useState("")
  if (!picker) throw new Error("EmojiPickerPanel must be used inside EmojiPicker")
  const groups = query.trim()
    ? [{ label: "Resultados", emojis: GROUPS.flatMap((group) => group.emojis) }]
    : GROUPS
  return <div className="w-80 overflow-hidden rounded-xl bg-card text-card-foreground">
    <div className="border-b p-2">
      <label className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
        <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <input className="min-w-0 flex-1 border-0 bg-transparent outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar emoji" aria-label="Buscar emoji" />
      </label>
    </div>
    <div className="max-h-72 overflow-y-auto p-2">
      {groups.map((group) => <section key={group.label} aria-label={group.label}>
        <h3 className="px-1 py-2 text-xs font-medium text-muted-foreground">{group.label}</h3>
        <div className="grid grid-cols-8 gap-1">
          {group.emojis.map((emoji, index) => <button key={emoji+index} type="button" className="grid size-8 place-items-center rounded-md text-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Insertar ${emoji}`} onClick={() => picker.onValueChange(emoji)}>{emoji}</button>)}
        </div>
      </section>)}
    </div>
    <div className="border-t px-3 py-2 text-xs text-muted-foreground" aria-live="polite">{picker.value ? `Seleccionado ${picker.value}` : "Selecciona un emoji"}</div>
  </div>
}
