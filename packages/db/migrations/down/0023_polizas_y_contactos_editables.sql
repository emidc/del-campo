-- Reversa de 0023: la póliza y el contacto vuelven a ser de sólo lectura en la app.
drop function public.eliminar_contacto(uuid);
drop function public.bloqueos_de_contacto(uuid);
drop function public.eliminar_poliza(uuid);

drop policy organization_membership_crear on organization_membership;
drop policy party_actualizar on party;
drop policy person_profile_actualizar on person_profile;
drop policy endorsement_crear on endorsement;
drop policy policy_version_actualizar on policy_version;
drop policy policy_version_crear on policy_version;
drop policy policy_actualizar on policy;
drop policy policy_crear on policy;

revoke insert (organization_party_id, person_party_id, kind) on organization_membership from broker_app;
revoke update (display_name_cache, updated_at) on party from broker_app;
revoke update (first_name, last_name, dni) on person_profile from broker_app;
revoke insert (policy_id, number, kind, effective_from, source_reference) on endorsement from broker_app;
revoke update (
  effective_to, product_reference, term_start_date, term_end_date, renewal_mode, premium,
  currency, status, producer, total_premium, sum_insured, payment_method
) on policy_version from broker_app;
revoke insert (
  policy_id, version_number, effective_from, effective_to, holder_party_id, product_reference,
  term_start_date, term_end_date, renewal_mode, premium, currency, status, endorsement_id,
  producer, total_premium, sum_insured, payment_method, source_event_type, source_event_id
) on policy_version from broker_app;
revoke update (policy_number) on policy from broker_app;
revoke insert (insurer_id, policy_number, renewed_from_policy_id) on policy from broker_app;

drop index endorsement_numero_broker_os;
alter table policy_version
  drop column payment_method,
  drop column sum_insured,
  drop column total_premium,
  drop column producer;

create or replace function policy_version_closed_is_immutable() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if TG_OP = 'DELETE' then
    if old.effective_to is not null then
      raise exception
        'policy_version %: no se puede borrar una versión cerrada (INV-PV-005/INV-013)', old.id;
    end if;
    return old;
  end if;

  if old.effective_to is not null then
    raise exception
      'policy_version %: no se puede modificar una versión ya cerrada (INV-PV-005/INV-013)', old.id;
  end if;

  return new;
end;
$$;
