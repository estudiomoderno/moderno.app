import * as React from "react"

function classes(...values: Array<string | undefined>) { return values.filter(Boolean).join(" ") }
export function Empty({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={classes("flex flex-col items-center justify-center text-center",className)} {...props}/>}
export function EmptyHeader({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={classes("flex max-w-md flex-col items-center",className)} {...props}/>}
export function EmptyMedia({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={classes("mb-4",className)} {...props}/>}
export function EmptyTitle({className,...props}:React.HTMLAttributes<HTMLHeadingElement>){return <h3 className={classes("text-base font-semibold",className)} {...props}/>}
export function EmptyDescription({className,...props}:React.HTMLAttributes<HTMLParagraphElement>){return <p className={classes("mt-1.5 text-sm text-muted-foreground",className)} {...props}/>}
