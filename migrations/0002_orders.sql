create table if not exists orders (
  id serial primary key,
  token integer not null,
  item text not null,
  status text not null check (status in ('preparing', 'ready', 'collected')),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  collected_at timestamptz
);

create index if not exists orders_status_created_idx on orders (status, created_at desc);
create index if not exists orders_token_created_idx on orders (token, created_at desc);

create table if not exists token_counter (
  service_date date primary key,
  next_token integer not null
);
