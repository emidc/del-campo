-- Reversa de 0033: los prospectos de WhatsApp pasan a Manual.
update party_role set origin = 'MANUAL' where origin = 'WHATSAPP';
alter table party_role drop constraint party_role_origin_check;
alter table party_role
  add constraint party_role_origin_check check (origin in ('INSTAGRAM', 'FACEBOOK', 'WEB', 'GOOGLE', 'MANUAL'));
