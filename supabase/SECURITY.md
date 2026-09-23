# Supabase security checklist

This application stores parent accounts, child profiles, and reading progress. The frontend uses only the public/publishable Supabase key, so database security must be enforced with Row Level Security (RLS).

## Required policies

### children

Expected columns used by the app:

- id
- parent_id
- nickname
- school_level
- avatar
- created_at

Enable RLS and only allow the authenticated parent to access rows where `parent_id = auth.uid()`.

Example:

```sql
alter table public.children enable row level security;

create policy "parents read own children"
on public.children
for select
to authenticated
using (parent_id = auth.uid());

create policy "parents create own children"
on public.children
for insert
to authenticated
with check (parent_id = auth.uid());

create policy "parents update own children"
on public.children
for update
to authenticated
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

create policy "parents delete own children"
on public.children
for delete
to authenticated
using (parent_id = auth.uid());
```

### progress

Expected columns used by the app:

- child_id
- lesson_id
- stars
- completed
- attempts
- correct_answers
- lesson_state

A parent should only be allowed to access progress for one of their own children.

Example:

```sql
alter table public.progress enable row level security;

create policy "parents read own child progress"
on public.progress
for select
to authenticated
using (
  exists (
    select 1
    from public.children c
    where c.id = progress.child_id
      and c.parent_id = auth.uid()
  )
);

create policy "parents create own child progress"
on public.progress
for insert
to authenticated
with check (
  exists (
    select 1
    from public.children c
    where c.id = progress.child_id
      and c.parent_id = auth.uid()
  )
);

create policy "parents update own child progress"
on public.progress
for update
to authenticated
using (
  exists (
    select 1
    from public.children c
    where c.id = progress.child_id
      and c.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.children c
    where c.id = progress.child_id
      and c.parent_id = auth.uid()
  )
);

create policy "parents delete own child progress"
on public.progress
for delete
to authenticated
using (
  exists (
    select 1
    from public.children c
    where c.id = progress.child_id
      and c.parent_id = auth.uid()
  )
);
```

## Required uniqueness

The frontend uses an upsert with:

```text
onConflict: child_id,lesson_id
```

The database should therefore have a unique constraint:

```sql
alter table public.progress
add constraint progress_child_lesson_unique
unique (child_id, lesson_id);
```

If this constraint already exists, do not create it again.

## Recommended foreign key

```sql
alter table public.progress
add constraint progress_child_fk
foreign key (child_id)
references public.children(id)
on delete cascade;
```

Only add this if an equivalent foreign key does not already exist.

## Client-side defense already present

The app also:

- filters child profile reads with `parent_id = session.user.id`
- rejects selecting a child whose `parent_id` does not match the current session
- only uses the Supabase publishable key in frontend code
- never uses a service-role key in the browser

These client checks are defense in depth. They do **not** replace RLS.

## Before public launch

1. Verify RLS is enabled on both tables.
2. Test two separate parent accounts.
3. Confirm Parent A cannot read or update Parent B's children or progress through the Supabase REST API.
4. Confirm anonymous users cannot read either table.
5. Keep service-role credentials only in server-side environments.
