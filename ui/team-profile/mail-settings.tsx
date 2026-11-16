"use client"

import { useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "./vendor/reui/alert-dialog"
import { Button } from "./vendor/reui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./vendor/reui/dropdown-menu"
import { LogOutIcon, PencilLineIcon } from "lucide-react"

export function MailSettings({ email, onEditSignature, onDisconnect, container }: any) {
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const cancel = useRef<HTMLButtonElement>(null)

  return (
    <>
      <div className="flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon" aria-label="Ajustes" title="Ajustes" className="mail-settings-trigger" />}
          >
            <img src="/brand/mail-icons/settings.svg?v=36711" width="18" height="18" alt="" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" container={container}>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onEditSignature}>
                <PencilLineIcon aria-hidden="true" />
                Diseñar/Editar firma
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDisconnectOpen(true)}>
              <LogOutIcon aria-hidden="true" />
              Desconectar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent size="sm" container={container} initialFocus={cancel} finalFocus={false}>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <LogOutIcon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Desconectar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Moderno dejará de acceder a {email} y eliminará sus credenciales guardadas. Podrás volver a conectarla cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancel} variant="ghost">Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { setDisconnectOpen(false); onDisconnect() }}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
