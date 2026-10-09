-- Owner: quitar el fallo antes de reprocesar. Repetible, sin borrar filas.
begin;
drop trigger if exists co01_fail_one on communication.message;
drop function if exists communication.co01_fail_one();
commit;
