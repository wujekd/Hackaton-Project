create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id bigint primary key generated always as identity,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  fts tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  embedding extensions.vector(512) not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_fts_idx
  on public.documents using gin (fts);

create index if not exists documents_embedding_hnsw_idx
  on public.documents using hnsw (embedding vector_ip_ops);

alter table public.documents enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and policyname = 'documents_public_read'
  ) then
    create policy documents_public_read
      on public.documents
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

create or replace function public.hybrid_search(
  query_text text,
  query_embedding extensions.vector(512),
  match_count int,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 50
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  score double precision
)
language sql
stable
as $$
with full_text as (
  select
    d.id,
    row_number() over (
      order by ts_rank_cd(d.fts, websearch_to_tsquery('english', query_text)) desc
    ) as rank_ix
  from public.documents d
  where d.fts @@ websearch_to_tsquery('english', query_text)
  limit least(match_count, 30) * 2
),
semantic as (
  select
    d.id,
    row_number() over (
      order by d.embedding <#> query_embedding
    ) as rank_ix
  from public.documents d
  limit least(match_count, 30) * 2
),
combined as (
  select
    coalesce(ft.id, sem.id) as id,
    coalesce(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
    coalesce(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight as score
  from full_text ft
  full outer join semantic sem
    on ft.id = sem.id
)
select
  d.id,
  d.content,
  d.metadata,
  c.score
from combined c
join public.documents d
  on d.id = c.id
order by c.score desc
limit least(match_count, 30);
$$;

grant execute on function public.hybrid_search(text, extensions.vector(512), int, float, float, int)
  to anon, authenticated, service_role;
