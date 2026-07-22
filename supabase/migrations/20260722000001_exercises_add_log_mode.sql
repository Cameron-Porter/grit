alter table exercises
  add column if not exists log_mode text check (log_mode in ('time')) default null;
