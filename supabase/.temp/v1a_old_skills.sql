select
  s.workspace_id,
  s.subject_id,
  count(*) as old_skill_count
from public.skills s
group by s.workspace_id, s.subject_id
order by s.workspace_id, s.subject_id;
