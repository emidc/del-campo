-- Reversa de 0036. Las pólizas anuladas desde la app quedan Anuladas, sin el estado previo.
revoke update (status_before_cancel) on policy_version from broker_app;
alter table policy_version drop column status_before_cancel;
