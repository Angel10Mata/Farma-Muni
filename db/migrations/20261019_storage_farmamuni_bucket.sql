-- FarmaMuni · Bucket de imágenes de marca (si no existe en el dashboard)
-- Ejecutar en el mismo proyecto Supabase que usa la app (.env).

insert into storage.buckets (id, name, public, file_size_limit)
values ('farmamuni', 'farmamuni', true, 204800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "farmamuni autenticado all" on storage.objects;
create policy "farmamuni autenticado all"
  on storage.objects for all to authenticated
  using (bucket_id = 'farmamuni')
  with check (bucket_id = 'farmamuni');

drop policy if exists "farmamuni lectura publica" on storage.objects;
create policy "farmamuni lectura publica"
  on storage.objects for select to public
  using (bucket_id = 'farmamuni');
