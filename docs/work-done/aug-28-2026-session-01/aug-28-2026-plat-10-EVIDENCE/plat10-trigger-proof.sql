-- PLAT-10 trigger proof, against the REAL database, inside one transaction that
-- is rolled back at the end. Nothing here survives the run: a throwaway sprint
-- created to prove a point would sit in the tracker forever, because a `done`
-- sprint is immutable and nothing in the product deletes a sprint.
begin;

create temporary table proof(step text, note text) on commit drop;

-- A test sprint with two items: 8pt done, 2pt todo. 10pt as scoped.
insert into public.sprints (sprint_number, name, state, planned_at, started_at, updated_by)
values (9901, 'PLAT-10 trigger proof', 'planned', '2026-08-28', '2026-08-28', 'SYSTEM');

insert into public.sprint_items (sprint_id, item_key, track, points, state, owner, title, dod, updated_by)
select id, 'PRF-01', 'platform', 8, 'done', 'BMAD', 'stays', 'proof', 'SYSTEM' from public.sprints where sprint_number = 9901
union all
select id, 'PRF-02', 'platform', 2, 'todo', 'BMAD', 'leaves', 'proof', 'SYSTEM' from public.sprints where sprint_number = 9901;

-- ── 1. While the sprint is still `planned`, moving an item out is RE-SCOPING,
--       not a departure. The ledger must stay empty.
update public.sprint_items set sprint_id = null, updated_by = 'SYSTEM'
 where item_key = 'PRF-02' and sprint_id = (select id from public.sprints where sprint_number = 9901);

insert into proof select '1. moved out while state=planned',
  'departures=' || (select departures::text from public.sprints where sprint_number = 9901);

-- put it back, and start the sprint
update public.sprint_items set sprint_id = (select id from public.sprints where sprint_number = 9901), updated_by = 'SYSTEM'
 where item_key = 'PRF-02' and sprint_id is null;
update public.sprints set state = 'in_progress', updated_by = 'SYSTEM' where sprint_number = 9901;

insert into proof select '2. sprint started, 2 items',
  'in-sprint points=' || (select sum(points)::text from public.sprint_items i
     join public.sprints s on s.id = i.sprint_id where s.sprint_number = 9901)
  || '  departures=' || (select departures::text from public.sprints where sprint_number = 9901);

-- ── 3. THE CASE. Move the unfinished 2pt item out of a RUNNING sprint.
update public.sprint_items set sprint_id = null, updated_by = 'SYSTEM'
 where item_key = 'PRF-02' and sprint_id = (select id from public.sprints where sprint_number = 9901);

insert into proof select '3. moved out while state=in_progress',
  'in-sprint points=' || coalesce((select sum(points)::text from public.sprint_items i
     join public.sprints s on s.id = i.sprint_id where s.sprint_number = 9901), '0')
  || '  departures=' || (select departures::text from public.sprints where sprint_number = 9901)
  || '  => planned = ' || (
       coalesce((select sum(points) from public.sprint_items i
          join public.sprints s on s.id = i.sprint_id where s.sprint_number = 9901), 0)
       + coalesce((select sum((d->>'points')::int) from public.sprints s,
            lateral jsonb_array_elements(s.departures) d where s.sprint_number = 9901), 0)
     )::text;

-- ── 4. Move it BACK IN. The departure must be cancelled, not double-counted.
update public.sprint_items set sprint_id = (select id from public.sprints where sprint_number = 9901), updated_by = 'SYSTEM'
 where item_key = 'PRF-02' and sprint_id is null;

insert into proof select '4. moved back in',
  'in-sprint points=' || (select sum(points)::text from public.sprint_items i
     join public.sprints s on s.id = i.sprint_id where s.sprint_number = 9901)
  || '  departures=' || (select departures::text from public.sprints where sprint_number = 9901)
  || '  => planned = ' || (
       coalesce((select sum(points) from public.sprint_items i
          join public.sprints s on s.id = i.sprint_id where s.sprint_number = 9901), 0)
       + coalesce((select sum((d->>'points')::int) from public.sprints s,
            lateral jsonb_array_elements(s.departures) d where s.sprint_number = 9901), 0)
     )::text;

-- ── 5. And out again, to show the ledger is append-only per departure and the
--       cancel in step 4 did not disable the trigger.
update public.sprint_items set sprint_id = null, updated_by = 'SYSTEM'
 where item_key = 'PRF-02' and sprint_id = (select id from public.sprints where sprint_number = 9901);

insert into proof select '5. moved out again',
  'departures=' || (select departures::text from public.sprints where sprint_number = 9901);

select step, note from proof order by step;

rollback;
