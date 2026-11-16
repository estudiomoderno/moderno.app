"use client"

import { useEffect, useRef, useState } from "react"
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
import { LogOutIcon, PencilLineIcon, XIcon } from "lucide-react"

function SignatureWindow({ email, onClose }: { email: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    close.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[40002] grid place-items-center bg-black/35 p-6 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="flex h-[min(720px,calc(100dvh-48px))] w-[min(1080px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mail-signature-title"
      >
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b px-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">CORREO</p>
            <h2 id="mail-signature-title" className="mt-1 text-lg font-semibold">Diseñar/Editar firma</h2>
          </div>
          <button ref={close} type="button" className="grid size-9 place-items-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={onClose} aria-label="Cerrar editor de firma">
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[256px_minmax(0,1fr)]">
          <aside className="border-r bg-muted/20 p-5">
            <p className="text-xs font-medium text-muted-foreground">CUENTA</p>
            <p className="mt-2 truncate text-sm font-medium" title={email}>{email}</p>
          </aside>
          <main className="flex min-h-0 items-center justify-center p-8">
            <div className="w-full max-w-xl rounded-xl border border-dashed p-10 text-center">
              <PencilLineIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">Editor de firma</h3>
              <p className="mt-2 text-sm text-muted-foreground">Aquí diseñaremos el contenido y el aspecto de la firma de esta cuenta.</p>
            </div>
          </main>
        </div>
      </section>
    </div>
  )
}

export function MailSettings({ email, onDisconnect, container }: any) {
  const [signatureOpen, setSignatureOpen] = useState(false)
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
              <DropdownMenuItem onClick={() => setSignatureOpen(true)}>
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

      {signatureOpen && <SignatureWindow email={email} onClose={() => setSignatureOpen(false)} />}

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
