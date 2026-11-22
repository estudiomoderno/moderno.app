-- Ajuste posterior a los avisos del asesor de rendimiento de Supabase.
begin;
drop policy if exists miembros_propios_select on public.miembros;
create policy miembros_propios_select on public.miembros
for select to authenticated using(user_id=(select auth.uid()));

drop policy if exists estudios_propios_select on public.estudios;
create policy estudios_propios_select on public.estudios
for select to authenticated using(exists(
  select 1 from public.miembros m
  where m.estudio_id=estudios.id and m.user_id=(select auth.uid())
));

drop policy if exists datos_estudio_miembros_select on public.datos_estudio;
create policy datos_estudio_miembros_select on public.datos_estudio
for select to authenticated using(
  public.app_rol_usuario(estudio_id,(select auth.uid())) in ('admin','colaborador')
);
commit;
