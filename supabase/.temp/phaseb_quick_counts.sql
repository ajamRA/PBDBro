select 'skill_groups' as table_name, count(*) as row_count from public.skill_groups
union all
select 'assessment_items', count(*) from public.assessment_items
union all
select 'assessment_sessions', count(*) from public.assessment_sessions
union all
select 'assessment_session_items', count(*) from public.assessment_session_items
union all
select 'assessment_summaries', count(*) from public.assessment_summaries;
