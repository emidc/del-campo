-- Un prospecto también puede llegar por WhatsApp: se crea desde una conversación sin
-- identificar en Comunicación.

alter table party_role drop constraint party_role_origin_check;
alter table party_role
  add constraint party_role_origin_check check (origin in ('INSTAGRAM', 'FACEBOOK', 'WEB', 'GOOGLE', 'MANUAL', 'WHATSAPP'));
