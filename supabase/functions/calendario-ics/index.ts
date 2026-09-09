// supabase/functions/calendario-ics/index.ts
// Sirve el calendario .ics del usuario cuyo token llega en ?t=…  (sin JWT: los calendarios no envían cabeceras)
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,   // solo aquí, en el servidor
);

const esc = (s: unknown) =>
  String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (iso: string) => iso.replace(/-/g, "");                 // 2026-09-03 → 20260903
const plus1 = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const isoOk = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const esToIso = (s: unknown) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s ?? "")); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null; };
const fold = (line: string) => { const out: string[] = []; let s = line; while (s.length > 73) { out.push(s.slice(0, 73)); s = " " + s.slice(73); } out.push(s); return out.join("\r\n"); };

type Ev = { uid: string; title: string; start: string; end?: string; desc?: string };

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[a-f0-9]{48}$/.test(t)) return new Response("Enlace no válido", { status: 404 });

  const { data, error } = await sb.rpc("app_calendario_consultar", { p_token: t });
  if (error) return new Response("Calendario no disponible", { status: 503 });
  if (!data) return new Response("Enlace no válido o sin acceso", { status: 404 });
  const proyectos: any[] = Array.isArray(data.proyectos) ? data.proyectos : [];
  const agenda: any = data.agenda ?? {};

  const evs: Ev[] = [];
  for (const p of proyectos) {
    if (p?.tpl || p?.status === "Archivado") continue;
    const num = p.num ?? "", name = p.name ?? "";
    // Fases del proyecto
    (p.phases ?? []).forEach((ph: any, i: number) => {
      if (isoOk(ph?.start) && isoOk(ph?.end) && ph.end >= ph.start)
        evs.push({ uid: `fase-${p.id}-${i}`, title: `${ph.name ?? "Fase"} · ${num}`, start: ph.start, end: plus1(ph.end), desc: `Fase del proyecto ${num} ${name}` });
    });
    // Fases de obra planificadas
    (p.obraF ?? []).forEach((f: any, i: number) => {
      if (isoOk(f?.start) && isoOk(f?.end) && f.end >= f.start)
        evs.push({ uid: `obra-${p.id}-${i}`, title: `🏗 ${f.name ?? "Fase"} · ${num}`, start: f.start, end: plus1(f.end), desc: `Fase de obra · ${num} ${name}${p.client ? " · " + p.client : ""}` });
    });
    // Tareas con fecha límite
    (p.tasks ?? []).forEach((tk: any, i: number) => {
      if (isoOk(tk?.due) && tk.col !== "done")
        evs.push({ uid: `tarea-${p.id}-${i}`, title: `☑ ${tk.title ?? "Tarea"} · ${num}`, start: tk.due, desc: `Tarea de ${num} ${name}${tk.assignee ? " · " + tk.assignee : ""}` });
    });
  }
  // Citas de la agenda (state.cal.events → {title,date}); las fechas pueden venir en ISO o dd/mm/aaaa
  (agenda?.events ?? []).forEach((e: any, i: number) => {
    const d = isoOk(e?.date) ? e.date : esToIso(e?.date);
    if (d) evs.push({ uid: `cita-${i}-${d}`, title: e.title ?? "Cita", start: d });
  });

  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Moderno.app//Calendario//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Moderno.app", "X-WR-TIMEZONE:Europe/Madrid", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of evs) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@moderno.app`, `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${ymd(e.end ?? plus1(e.start))}`,
      `SUMMARY:${esc(e.title)}`);
    if (e.desc) lines.push(`DESCRIPTION:${esc(e.desc)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const body = lines.map(fold).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="moderno-app.ics"',
      "Cache-Control": "private, no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
