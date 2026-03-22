-- Documentation feedback table for the in-app docs module
create table if not exists public.docs_feedback (
  id uuid primary key default gen_random_uuid(),
  doc_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  is_helpful boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint docs_feedback_unique_per_user unique (doc_slug, user_id)
);

alter table public.docs_feedback enable row level security;

create policy "Users can insert their own feedback"
  on public.docs_feedback for insert
  with check (
    user_id = (select id from public.profiles where user_id = auth.uid() limit 1)
  );

create policy "Users can update their own feedback"
  on public.docs_feedback for update
  using (
    user_id = (select id from public.profiles where user_id = auth.uid() limit 1)
  );

create policy "Users can view their own feedback"
  on public.docs_feedback for select
  using (
    user_id = (select id from public.profiles where user_id = auth.uid() limit 1)
  );

create policy "Admins can view all company feedback"
  on public.docs_feedback for select
  using (
    company_id in (
      select p.company_id from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );
