-- Jalankan sekali di Supabase SQL Editor agar aplikasi (anon key) bisa baca/tulis data.
-- Tabel yang sudah ada tidak dihapus.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.master_barang_titipan to anon, authenticated;
grant select, insert, update, delete on table public.usulan_barang_titipan to anon, authenticated;
grant select, insert, update, delete on table public.master_pemesan to anon, authenticated;

alter table public.master_barang_titipan enable row level security;
alter table public.usulan_barang_titipan enable row level security;
alter table public.master_pemesan enable row level security;

drop policy if exists "public_crud_master_barang_titipan" on public.master_barang_titipan;
create policy "public_crud_master_barang_titipan"
on public.master_barang_titipan
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public_crud_usulan_barang_titipan" on public.usulan_barang_titipan;
create policy "public_crud_usulan_barang_titipan"
on public.usulan_barang_titipan
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public_crud_master_pemesan" on public.master_pemesan;
create policy "public_crud_master_pemesan"
on public.master_pemesan
for all
to anon, authenticated
using (true)
with check (true);
