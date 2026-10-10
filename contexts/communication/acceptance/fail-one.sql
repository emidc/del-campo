-- Owner, solo durante el ensayo coordinado. Falla únicamente el marcador reservado.
-- No ejecutar si CO01-P1-901 ya existe; elegir una corrida nueva documentada.
begin;
create function communication.co01_fail_one() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.direction = 'inbound' and new.body = 'CO01-P1-901' then
    raise exception 'CO01_CONTROLLED_FAILURE';
  end if;
  return new;
end $$;
create trigger co01_fail_one before insert on communication.message
for each row execute function communication.co01_fail_one();
commit;
