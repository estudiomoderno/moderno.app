"use client"

import { useState } from "react"
import { EmojiPicker, EmojiPickerPanel } from "./vendor/reui/emoji-picker"
import { Card } from "./vendor/reui/card"

export function MailEmoji({onPick}:{onPick:(value:string)=>void}) {
 const [value, setValue] = useState<string | null>(null)
 return <Card className="w-fit py-0">
  <EmojiPicker value={value} onValueChange={(next)=>{setValue(next);onPick(next)}}>
   <EmojiPickerPanel />
  </EmojiPicker>
 </Card>
}
