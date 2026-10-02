-- T-0022 / D-0064 — los enlaces de Drive que el lote de Zoho informa son un nivel
-- propio, distinto del comprobado por una persona (D-0057).
--
-- El nivel se persiste como columna de `document_link` y no como tabla aparte a
-- propósito: el refresco de producción (docs/despliegue/vercel-vs01.md §10) copia y
-- vacía `document_link`, y una tabla nueva obligaría a sumarla al dump, al vaciado y al
-- orden que exigen los triggers de validación. Como columna, el nivel viaja con la
-- tabla que ya viaja.

alter table document_link
  add column link_level text not null default 'HUMAN'
  check (link_level in ('HUMAN', 'ZOHO_UNVERIFIED'));

-- Las filas existentes son las de T-0017: comprobadas por una persona, con verificador,
-- evidencia, fecha y cuenta registrados. El default las deja en 'HUMAN' y después se
-- quita, para que toda fila nueva declare su nivel explícitamente en vez de heredarlo.
alter table document_link
  alter column link_level drop default;

comment on column document_link.link_level is
  'HUMAN: relación comprobada por una persona (D-0057, registro en document_verification_input). '
  'ZOHO_UNVERIFIED: enlace que el lote de Zoho informa y nadie comprobó (D-0064); '
  'no es evidencia de verificación y nunca prevalece sobre un HUMAN.';

-- Un enlace de Zoho es una foto del lote: a lo sumo uno por recurso. Dos filas
-- ZOHO_UNVERIFIED para la misma Policy o la misma Party serían una ambigüedad que la
-- consulta tendría que resolver eligiendo, y D-0064 no autoriza elegir. El cargador ya
-- deduplica por recurso; la constraint hace que no dependa de que así sea. El índice
-- sirve además al delete de la foto anterior, que filtra por este mismo predicado.
create unique index document_link_zoho_unico_por_recurso
  on document_link (resource_type, resource_id)
  where link_level = 'ZOHO_UNVERIFIED';
