alter table program_days
  add column if not exists skipped boolean not null default false;
