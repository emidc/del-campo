-- Reversa de 0009. Vuelve el camino `oidc` de 0006 a 0008: `risk_app` vuelve a poder asumir
-- `risk_persona`, como lo dejaba el `deploy/rol-app.sql` anterior a esta migración.
-- `risk_oidc` se borra si nadie más depende de él.

drop policy evento_auditoria_rechazo on risk.evento_auditoria;
revoke all on risk.evento_auditoria from risk_oidc;

drop function risk.admision_registrar(text, text, text, text, bigint);
drop function risk.admision_invitacion(text);
drop function risk.admision_credencial(text, text);

revoke usage on schema risk from risk_oidc;

-- Sólo donde `risk_app` entra (la base hosteada, después de `rol-app.sql`): ahí el
-- `rol-app.sql` anterior a 0009 se la había dado. En local no la tenía.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'risk_app' and rolcanlogin) then
    grant risk_persona to risk_app with inherit false, set true;
  end if;
end
$$;

-- Antes de intentar borrarlo: si el rol sigue en uso en otra base y no se puede borrar, que
-- no quede pudiendo entrar ni asumir `risk_persona`.
revoke risk_persona from risk_oidc;
alter role risk_oidc nologin;

do $$
begin
  drop role risk_oidc;
exception
  when dependent_objects_still_exist then
    raise notice 'risk_oidc sigue en uso en otra base; queda sin LOGIN, sin risk_persona y sin permisos sobre risk';
end
$$;
