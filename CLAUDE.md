@AGENTS.md

# Supabase Rules

- Supabase MCP is read-only reference access.
- Never execute migrations.
- Never modify database schema directly.
- Never insert/update/delete production data.
- Generate SQL migration files only.
- I will manually run supabase db push.