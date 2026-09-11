import fs from 'node:fs';
let sql=fs.readFileSync(new URL('./sql/recorrido-base.sql',import.meta.url),'utf8');
sql=sql.replace('select * from recorrido;',()=>`do $$declare e uuid:='33700000-0000-4000-8000-000000000001';d jsonb;visible jsonb;merged jsonb;failed boolean:=false;begin
 select contenido into d from public.datos_estudio where estudio_id=e and bloque='proyectos';
 d:=jsonb_set(d,'{0,rooms,0,boardRevisions}','[{"id":"board-342","date":"2026-09-11","room":{"name":"Sala","sections":[]}}]');
 perform public.guardar_bloque_versionado(e,'proyectos',d,x.updated_at) from public.datos_estudio x where estudio_id=e and bloque='proyectos';
 select contenido into d from public.datos_estudio where estudio_id=e and bloque='proyectos';
 insert into recorrido values('board_guardado_versionado',d#>>'{0,rooms,0,boardRevisions,0,id}'='board-342');
 visible:=public.app_colaborador_filtrar(d);
 insert into recorrido values('board_no_expuesto_colaborador',visible#>'{0,rooms,0,boardRevisions}' is null);
 merged:=public.app_colaborador_combinar(d,jsonb_set(visible,'{0,rooms,0,name}','"Sala editada"'));
 insert into recorrido values('board_conservado_tras_edicion_colaborador',merged#>'{0,rooms,0,boardRevisions}'=d#>'{0,rooms,0,boardRevisions}');
 begin perform public.app_colaborador_combinar(d,jsonb_set(visible,'{0,rooms,0,boardRevisions}','[]'));exception when sqlstate '42501' then failed:=true;end;
 insert into recorrido values('board_inyeccion_colaborador_rechazada',failed);
end$$;
select * from recorrido;`);
if(!process.argv[2])throw Error('Indica salida');fs.writeFileSync(process.argv[2],sql);
