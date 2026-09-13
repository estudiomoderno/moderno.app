-- Candidato local. Depende de permisos-colaboradores.sql ya instalado.
-- Solo amplía el filtro para important booleano; no reescribe datos ni cambia roles.
begin;
create or replace function public.app_colaborador_filtrar(v jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare r jsonb; k text; hijo jsonb;
begin
 if jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.app_colaborador_filtrar(x)),'[]') into r
  from jsonb_array_elements(v) x where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  return r;
 elsif jsonb_typeof(v)='object' then
  r:='{}';
  for k,hijo in select key,value from jsonb_each(v) loop
   if k='important' and jsonb_typeof(hijo)='boolean' then
    r:=r||jsonb_build_object(k,hijo);
   elsif k=any(array['id','name','num','title','brand','client','clientIdx','status','curPhase','tpl','rooms','sections','items','tasks','files','notes','note','desc','description','url','data','type','when','date','due','start','end','color','done','col','who','assignees','assignee','subs','deps','comments','chat','cliChat','cid','txt','ts','fases','updated','off','showTasks','showObra','pid','src','subtasks','text','t','qty','price','unit','sku','supplier','dims','material','plazo','img','libId','cat','rstatus','code','email','phone','fiscal','nif','cp','folder','createdBy','createdByMail','createdAt','addr','city','country','trade','obraF','obraPlanos','obraContactos','phases','account','logos','BRAND','wsOrder','users','role','ibv','onboarded','idPrefix','series','counters','view','month','year','week','events','weekend','showWeekends','homePage','dateFmt','lang','timezone','n','chip','back','soft']) then
    r:=r||jsonb_build_object(k,public.app_colaborador_filtrar(hijo));
   end if;
  end loop;
  return r;
 end if;
 return v;
end $$;
revoke all on function public.app_colaborador_filtrar(jsonb) from public,anon,authenticated;

commit;
