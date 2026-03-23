-- Platform-editable documentation (markdown). Registry in code + file fallback; DB row overrides body and optional metadata.
create table if not exists public.platform_documentation (
  slug text primary key,
  body_markdown text not null default '',
  title text,
  description text,
  category text,
  icon_key text,
  roles text[] not null default array['admin', 'user']::text[],
  module_route text,
  sort_order integer,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint platform_documentation_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint platform_documentation_category_check check (
    category is null or category in ('getting-started', 'ctms', 'trackers', 'payments', 'admin')
  )
);

create index if not exists platform_documentation_category_idx on public.platform_documentation (category);

alter table public.platform_documentation enable row level security;

drop policy if exists "platform_documentation_select_authenticated" on public.platform_documentation;
drop policy if exists "platform_documentation_insert_platform_admin" on public.platform_documentation;
drop policy if exists "platform_documentation_update_platform_admin" on public.platform_documentation;
drop policy if exists "platform_documentation_delete_platform_admin" on public.platform_documentation;

-- Read: company admins, platform admins, or users when doc is marked for users
create policy "platform_documentation_select_authenticated"
  on public.platform_documentation for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
      and (
        p.is_platform_admin = true
        or p.role = 'admin'
        or (p.role = 'user' and 'user' = any(platform_documentation.roles))
      )
    )
  );

-- Write: platform admins only
create policy "platform_documentation_insert_platform_admin"
  on public.platform_documentation for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_platform_admin = true
    )
  );

create policy "platform_documentation_update_platform_admin"
  on public.platform_documentation for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_platform_admin = true
    )
  );

create policy "platform_documentation_delete_platform_admin"
  on public.platform_documentation for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_platform_admin = true
    )
  );
