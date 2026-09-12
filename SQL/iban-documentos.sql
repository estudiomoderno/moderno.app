-- Adición a las proyecciones: IBAN fijado al crear cada documento.
-- No reescribe documentos, cuentas ni archivos existentes.
begin;
do $$ declare original text; candidato text; begin
 original:=pg_get_functiondef('public.portal_cliente_lee_original(text)'::regprocedure);
 if position('paymentIban' in original)=0 then
  candidato:=regexp_replace(original,'''lines''\s*,\s*coalesce\(f\.value->''lines''','''paymentIban'', f.value->''paymentIban'', ''lines'', coalesce(f.value->''lines''');
  if candidato=original then raise exception 'Proyección original no reconocida. Revisar antes de aplicar.';end if;
  execute candidato;
 end if;
 original:=pg_get_functiondef('public.portal_filtrar(jsonb,text)'::regprocedure);
 if position('paymentIban' in original)=0 then
  candidato:=replace(original,'array[''ref'',''date'',''total'',''status'']','array[''ref'',''date'',''total'',''status'',''paymentIban'']');
  if candidato=original then raise exception 'Filtro de portal no reconocido';end if;
  execute candidato;
 end if;
 original:=pg_get_functiondef('public.app_finanzas_lectura(jsonb)'::regprocedure);
 if position('paymentIban' in original)=0 then
  candidato:=replace(original,'''status'',''legend'',''due'']','''status'',''legend'',''due'',''paymentIban'']');
  if candidato=original then raise exception 'Filtro financiero no reconocido';end if;
  execute candidato;
 end if;
end $$;
commit;
