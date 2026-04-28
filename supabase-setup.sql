-- ═══════════════════════════════════════════════════════
-- TSP ARQUITECTURA · Supabase Setup SQL
-- Corré este script en Supabase → SQL Editor → New query
-- ═══════════════════════════════════════════════════════


-- ── 1. Tabla de perfiles de usuario ──────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  role        text not null default 'client' check (role in ('admin', 'client')),
  status      text not null default 'pending' check (status in ('active', 'pending')),
  initials    text,
  created_at  timestamp with time zone default now()
);

-- Activar Row Level Security
alter table public.profiles enable row level security;

-- Políticas: cada usuario ve su propio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- El admin puede ver todos los perfiles
create policy "Admin can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- El admin puede actualizar perfiles
create policy "Admin can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- El admin puede eliminar perfiles
create policy "Admin can delete profiles"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Permite insertar el propio perfil al registrarse
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ── 2. Tabla de proyectos ─────────────────────────────────
create table public.projects (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  subtitle    text,
  location    text,
  stage       text default 'Anteproyecto',
  client_id   uuid references public.profiles(id) on delete set null,
  updated_at  text default to_char(now(), 'DD/MM/YYYY'),
  created_at  timestamp with time zone default now()
);

alter table public.projects enable row level security;

-- El cliente ve solo su proyecto
create policy "Client can view own project"
  on public.projects for select
  using (client_id = auth.uid());

-- El admin ve todos los proyectos
create policy "Admin can view all projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- El admin puede insertar proyectos
create policy "Admin can insert projects"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- El admin puede actualizar proyectos
create policy "Admin can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- El admin puede eliminar proyectos
create policy "Admin can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ── 3. Función para crear perfil automáticamente al registrarse ──
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
  user_initials text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_initials := upper(substring(split_part(user_name, ' ', 1), 1, 1) ||
                   coalesce(substring(split_part(user_name, ' ', 2), 1, 1), ''));
  
  insert into public.profiles (id, name, role, status, initials)
  values (
    new.id,
    user_name,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    case when coalesce(new.raw_user_meta_data->>'role', 'client') = 'admin' then 'active' else 'pending' end,
    user_initials
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: se ejecuta cada vez que se crea un usuario
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 4. Storage bucket para archivos del proyecto ──────────
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true);

-- Política: el admin puede subir archivos
create policy "Admin can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Política: cualquiera autenticado puede ver archivos
create policy "Authenticated users can view files"
  on storage.objects for select
  using (bucket_id = 'project-files' and auth.role() = 'authenticated');

-- Política: el admin puede eliminar archivos
create policy "Admin can delete files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ── 5. Crear usuario admin inicial ───────────────────────
-- IMPORTANTE: Después de correr este script, creá el usuario admin
-- desde Supabase → Authentication → Users → Add user:
--   Email:    admin@tsp.com
--   Password: (la que quieras)
-- Luego corrés esto para darle rol admin:
--
-- update public.profiles
-- set role = 'admin', status = 'active'
-- where id = (select id from auth.users where email = 'admin@tsp.com');
