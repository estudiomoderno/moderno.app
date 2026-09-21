-- Existing portal access and token validation are unchanged.
-- Exposes only task title/status/due and image/unit on already shared shopping lists.
begin;
do $migration$
declare original text; revised text;
begin
 original:=pg_get_functiondef('public.portal_filtrar(jsonb,text)'::regprocedure);
 if position('''rooms'',salas,''cliShare''' in original)=0 then raise exception 'Unexpected portal filter; no changes applied'; end if;
 revised:=replace(original,'''rooms'',salas,''cliShare''','''rooms'',salas,''tasks'',coalesce((select jsonb_agg(public.portal_campos(t,array[''title'',''col'',''due''])) from jsonb_array_elements(coalesce(p->''tasks'',''[]'')) t where jsonb_typeof(t)=''object''),''[]''::jsonb),''cliShare''');
 revised:=replace(revised,'public.portal_campos(i,array[''id'',''name'',''qty'',''price'',''cli''])','(public.portal_campos(i,array[''id'',''name'',''qty'',''price'',''cli'',''unit''])||case when jsonb_typeof(i->''img'')=''string'' then jsonb_build_object(''img'',i->''img'') else ''{}''::jsonb end)');
 if revised=original then raise exception 'No compatible changes'; end if;
 execute revised;
end $migration$;
commit;
