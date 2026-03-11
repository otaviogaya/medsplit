do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'procedimentos-documentos'
  ) then
    insert into storage.buckets (id, name, public)
    values ('procedimentos-documentos', 'procedimentos-documentos', true);
  end if;
end $$;

drop policy if exists "documentos_select_authenticated" on storage.objects;
create policy "documentos_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'procedimentos-documentos');

drop policy if exists "documentos_insert_own_folder" on storage.objects;
create policy "documentos_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'procedimentos-documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documentos_update_own_folder" on storage.objects;
create policy "documentos_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'procedimentos-documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'procedimentos-documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documentos_delete_own_folder" on storage.objects;
create policy "documentos_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'procedimentos-documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
