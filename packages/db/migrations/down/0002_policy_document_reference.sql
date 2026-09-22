-- Inversa de T-0019. No descarta asociaciones silenciosamente: una base con datos debe
-- migrarlos o resolverlos antes de retirar la estructura que preserva su pertenencia.

do $$
begin
  if exists (select 1 from policy_document_reference) then
    raise exception
      '0002_policy_document_reference: no se puede revertir con asociaciones existentes';
  end if;
end;
$$;

drop trigger external_reference_document_policy_total on external_reference;
drop table policy_document_reference;
drop function policy_document_reference_totality();
drop function external_reference_document_policy_totality();
drop function assert_policy_document_reference_totality(uuid);
drop function policy_document_reference_requires_document_kind();
