-- Run once in the Supabase SQL editor. Keeps catalog reads restricted to Connor.
-- The application already validates the same owner on every catalog API request.
begin;
alter table public.pins enable row level security;
alter table public.pin_images enable row level security;
revoke all on public.pins, public.pin_images from anon;
revoke insert, update, delete on public.pins, public.pin_images from authenticated;
grant select on public.pins, public.pin_images to authenticated;
drop policy if exists personal_owner_catalog on public.pins;
create policy personal_owner_catalog on public.pins for select to authenticated
using (lower(auth.jwt()->>'email') = 'connorc1232@icloud.com');
drop policy if exists personal_owner_images on public.pin_images;
create policy personal_owner_images on public.pin_images for select to authenticated
using (lower(auth.jwt()->>'email') = 'connorc1232@icloud.com');
-- Restrictive guards also constrain any older permissive policies.
drop policy if exists personal_owner_guard on public.pins;
create policy personal_owner_guard on public.pins as restrictive for all to authenticated
using (lower(auth.jwt()->>'email') = 'connorc1232@icloud.com')
with check (lower(auth.jwt()->>'email') = 'connorc1232@icloud.com');
drop policy if exists personal_owner_guard on public.pin_images;
create policy personal_owner_guard on public.pin_images as restrictive for all to authenticated
using (lower(auth.jwt()->>'email') = 'connorc1232@icloud.com')
with check (lower(auth.jwt()->>'email') = 'connorc1232@icloud.com');
commit;
