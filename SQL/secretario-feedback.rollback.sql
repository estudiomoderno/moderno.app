-- Reversión no destructiva. Desactivar también el flag de UI y la Edge Function.
-- Conserva preferencias/eventos. Mantiene consulta/retirada para que cada
-- persona pueda eliminar sus aportaciones; bloquea activaciones y envíos.
begin;
revoke all on function public.secretary_feedback_submit(uuid,jsonb) from public,anon,authenticated;
revoke all on function moderno_secretary.submit(uuid,jsonb) from public,anon,authenticated;
create or replace function moderno_secretary.consent_set(p_estudio uuid,p_enabled boolean,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor_id uuid; current_revision bigint;
begin
 if p_enabled is distinct from false then raise exception 'La mejora está desactivada' using errcode='42501';end if;
 actor_id:=moderno_secretary.actor(p_estudio,false);
 update moderno_secretary.consent set enabled=false,revision=revision+1,updated_at=clock_timestamp()
 where user_id=actor_id and estudio_id=p_estudio returning revision into current_revision;
 delete from moderno_secretary.feedback where user_id=actor_id and estudio_id=p_estudio;
 return jsonb_build_object('version',1,'enabled',false,'revision',coalesce(current_revision,0));
end $fn$;
commit;
