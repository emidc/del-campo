-- Reversa de 0027.
drop index task_semana_idx;
revoke update (weekly) on task from broker_app;
alter table task drop column weekly;
