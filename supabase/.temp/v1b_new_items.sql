select
  ai.workspace_id,
  ai.subject_id,
  count(*) as new_item_count
from public.assessment_items ai
join public.skill_groups sg on sg.id = ai.skill_group_id
where sg.name = 'Legacy Import (Flat Skills)'
group by ai.workspace_id, ai.subject_id
order by ai.workspace_id, ai.subject_id;
