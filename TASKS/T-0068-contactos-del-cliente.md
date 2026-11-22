---
id: T-0068
title: Cargar teléfono y mail en la ficha del cliente
status: DONE
created: 2026-11-16
linear: EMI-138
---

## Para qué

La conversación de WhatsApp aparece en la ficha de un cliente sólo cuando su teléfono está
cargado. Hoy los teléfonos y mails vienen únicamente de la importación de Zoho, la ficha no
los muestra y el equipo no puede cargarlos ni corregirlos. Quien atiende un mensaje «sin
identificar» no tiene forma de vincularlo con el cliente.

## Listo cuando

- La ficha de empresa y de persona muestra sus teléfonos y mails.
- El equipo puede agregar, corregir y dar de baja un teléfono o un mail desde la ficha.
- Desde una conversación sin identificar se puede elegir el cliente, y su teléfono queda cargado en la ficha.
- Al cargar el teléfono, la conversación aparece en la pestaña WhatsApp del cliente.
- `pnpm check` en verde.

## Fuera de alcance

Recibir o enviar correo desde Broker OS. Verificar que el teléfono o el mail sean del cliente.

## Avance

- 16/11/2026: tarjeta «Teléfonos y mails» en el Resumen de la ficha (ver, agregar, corregir y dar de baja), y «¿Es un cliente?» en la conversación sin identificar, que busca el cliente y le guarda el teléfono. Migración `0022`. Queda que Emiliano la aplique en producción y lo pruebe.
- 22/11/2026: teléfonos y mails de Zoho pasados a +54 y sin repetidos (PR 183). Contactos editables en la ficha (PRs 184 y 185).
