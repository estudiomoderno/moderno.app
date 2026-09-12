-- Append inside the transaction of SQL/suscripciones-test.sql, replacing its COMMIT.
-- Clone szbswxpkhidywaosdfcg only. Fictitious study, no Stripe requests or emails.
do $$ declare s uuid:='b25c0772-3db1-46ad-a4ed-8f191d1e9781';u uuid:='5fa5231a-216f-42b3-890f-cefe786907c7';r uuid:=gen_random_uuid();a jsonb;b jsonb;l jsonb;before_data text;after_data text; begin
 if not exists(select 1 from auth.users where id=u and email='clipper-ui-20260912@example.invalid') or public.app_rol_usuario(s,u)<>'admin' then raise exception 'No es el clon esperado';end if;
 select md5(string_agg(contenido::text,'|' order by estudio_id,bloque)) into before_data from public.datos_estudio;
 a:=public.billing_test_begin(u,s,r,'ensayo-local');
 b:=public.billing_test_begin(u,s,gen_random_uuid(),'ensayo-local');
 if a->>'requestId'<>b->>'requestId' then raise exception 'Intento duplicado';end if;
 perform public.billing_test_checkout_save(u,s,r,'cus_clon3531','cs_test_clon3531');
 l:=public.billing_test_claim('evt_clon3531',s,r,'cus_clon3531','sub_clon3531');
 if l->>'token' is null then raise exception 'Falta bloqueo';end if;
 perform public.billing_test_finish('evt_clon3531',s,(l->>'token')::uuid,'{"customerId":"cus_clon3531","subscriptionId":"sub_clon3531","status":"canceled","eligible":false}');
 if not (public.billing_test_claim('evt_clon3531',s,r,'cus_clon3531','sub_clon3531')->>'duplicate')::boolean then raise exception 'Evento duplicado no reconocido';end if;
 select md5(string_agg(contenido::text,'|' order by estudio_id,bloque)) into after_data from public.datos_estudio;
 if before_data is distinct from after_data or public.app_rol_usuario(s,u)<>'admin' then raise exception 'Cambio ajeno a facturacion';end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.billing_test_authorize('5fa5231a-216f-42b3-890f-cefe786907c7','b25c0772-3db1-46ad-a4ed-8f191d1e9781');raise exception 'ERROR: acceso directo permitido';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'Facturacion test: ensayo revertido; sin pagos ni cambios de datos' resultado;
