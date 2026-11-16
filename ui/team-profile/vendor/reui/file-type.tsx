import * as React from "react"

export type FileTypeVariant = "outline" | "solid" | "light" | "mono"
export type FileTypeCategory = "archive"|"audio"|"code"|"design"|"document"|"empty"|"executable"|"folder"|"font"|"image"|"presentation"|"spreadsheet"|"video"|"file"
export type FileTypeName = string
export const FILE_TYPE_EXTENSION_NAMES = ["pdf","doc","docx","txt","rtf","xls","xlsx","csv","ppt","pptx","png","jpg","jpeg","gif","webp","svg","mp4","mov","mp3","wav","zip","rar","7z","json","html","css","js","ts","fig","psd","dwg","dxf","ttf","otf"]
const groups:Record<string,FileTypeCategory>={pdf:"document",doc:"document",docx:"document",txt:"document",rtf:"document",xls:"spreadsheet",xlsx:"spreadsheet",csv:"spreadsheet",ppt:"presentation",pptx:"presentation",png:"image",jpg:"image",jpeg:"image",gif:"image",webp:"image",svg:"image",avif:"image",heic:"image",heif:"image",tif:"image",tiff:"image",bmp:"image",mp4:"video",mov:"video",avi:"video",mp3:"audio",wav:"audio",zip:"archive",rar:"archive","7z":"archive",json:"code",html:"code",css:"code",js:"code",ts:"code",fig:"design",psd:"design",dwg:"design",dxf:"design",exe:"executable",ttf:"font",otf:"font"}
export function getFileType(name:string){const clean=String(name||"").toLowerCase();return clean.includes(".")?clean.split(".").pop()||"file":"file"}
export function getFileTypeCategory(type:string):FileTypeCategory{return groups[String(type).toLowerCase()]||"file"}
export function FileType({type,variant="outline",size="default",...props}:{type:string;variant?:FileTypeVariant;size?:"mini"|"default";[key:string]:unknown}){
 const extension=String(type||"file").replace(/^.*\//,"").replace(/^x-/,'').slice(0,4).toUpperCase(),mini=size==="mini"
 return <span className={`relative inline-grid shrink-0 place-items-center ${mini?"size-7":"size-10"}`} data-variant={variant} {...props}>
  <svg className="absolute inset-0 size-full text-muted-foreground" viewBox="0 0 32 38" fill="none" aria-hidden="true"><path d="M5 1.5h14l8 8V36.5H5z" stroke="currentColor" strokeWidth="1.5"/><path d="M19 1.5v8h8" stroke="currentColor" strokeWidth="1.5"/></svg>
  <span className={`${mini?"mt-2 text-[7px]":"mt-3 text-[9px]"} max-w-[80%] truncate font-semibold tracking-tight text-foreground`}>{extension||"FILE"}</span>
 </span>
}
