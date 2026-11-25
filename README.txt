ALLISON ABRIL — INVITACIÓN DIGITAL
===================================

Proyecto web de la invitación de Allison Abril.

FUNCIONES
---------
- Portada animada, música y contenido original.
- Enlaces de invitación personalizados con pases asignados.
- Pase general reutilizable: el mismo enlace puede compartirse con muchas personas.
- Cada persona que responde desde el pase general genera su propio registro en Google Sheets.
- Panel administrativo con listado, edición y eliminación de invitados.
- Confirmaciones y estadísticas de asistencia.
- Backend Google Apps Script + Google Sheets.

PASE GENERAL
------------
El enlace general no representa a una sola persona. Cada persona escribe su nombre y
envía su propia respuesta; el backend crea un registro independiente (un pase/persona).
Los reintentos de una misma solicitud no duplican el registro.

INSTALACIÓN
-----------
Lee README-INSTALACION.txt. Este paquete actualiza el frontend y apps-script/Code.gs.
Como Apps Script se publica por separado, debes reemplazar Code.gs en el proyecto existente,
ejecutar setup() para añadir columnas faltantes sin borrar datos y publicar una nueva versión.

OPTIMIZACIÓN
------------
Las imágenes están en WebP de alta calidad con transparencia. Audio y videos fueron
recomprimidos para web. Las referencias de archivos están actualizadas en design.json,
design.js y allison-update.js.
