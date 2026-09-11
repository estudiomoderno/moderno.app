import {pathToFileURL} from 'node:url';

export function backupHealth(runs, now = Date.now()) {
  if (!Array.isArray(runs) || !Number.isFinite(now)) throw Error('Respuesta de supervisión no válida');
  const scheduled = runs.filter(r => r.event === 'schedule' && r.head_branch === 'main')
    .sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at));
  if (scheduled.some(r => !Number.isFinite(Date.parse(r.created_at)))) throw Error('Fecha de ejecución no válida');
  const success = scheduled.find(r => r.status === 'completed' && r.conclusion === 'success');
  const last = scheduled[0];
  const completed = scheduled.find(r => r.status === 'completed');
  const reasons = [];
  if (!success) reasons.push('No consta una copia programada correcta');
  else if (now-Date.parse(success.created_at)>30*3600000) reasons.push('Más de 30 horas sin copia programada correcta');
  if (completed && completed.conclusion !== 'success') reasons.push('El último intento completado no terminó correctamente');
  if (last && last.status !== 'completed' && now-Date.parse(last.created_at)>3600000) reasons.push('La ejecución lleva más de una hora sin terminar');
  return {ok:reasons.length===0, reasons, lastSuccess:success?.created_at??null, lastAttempt:last?.created_at??null,
    runUrl:last?.html_url??null};
}

export async function check(fetcher=fetch) {
  const url='https://api.github.com/repos/estudiomoderno/moderno.app/actions/workflows/backup-storage.yml/runs?event=schedule&branch=main&per_page=100';
  const response=await fetcher(url,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw Error('GitHub no permite comprobar las copias');
  return backupHealth((await response.json()).workflow_runs);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try {const result=await check();console.log(JSON.stringify(result));process.exitCode=result.ok?0:1;}
  catch {console.error('Supervisión no disponible; no se puede determinar el estado de las copias.');process.exitCode=2;}
}
