ALLISON ABRIL — ACTUALIZACIÓN DEL SISTEMA DE INVITADOS
======================================================

CONTENIDO
---------
- index.html, script.js, design.js, design.json, styles.css: invitación.
- assets/: imágenes optimizadas a WebP, música y videos optimizados.
- allison-update.js / allison-update.css: funciones de invitación y panel.
- allison-config.js: URL de Google Apps Script ya configurada.
- apps-script/Code.gs: backend actualizado.
- Code.gs (copia en la raíz): mismo backend, para copiarlo con facilidad.

IMPORTANTE SOBRE EL PASE GENERAL
--------------------------------
El panel incluye «GENERAR ENLACE DE PASE GENERAL». Es un solo enlace que puedes
compartir con muchas personas. El enlace NO representa a un solo invitado.

Cada persona que abre el pase general:
1. Escribe su propio nombre.
2. Elige en el selector deslizante «SÍ ASISTIRÉ» o «NO PODRÉ ASISTIR».
3. Envía su respuesta; el servidor crea un registro individual en INVITADOS y CONFIRMACIONES.
4. WhatsApp prepara un texto que indica expresamente si SÍ asistirá o NO podrá asistir.

Así, varias personas pueden utilizar la misma URL sin sobrescribir las respuestas
de otras. Un reintento técnico de la misma solicitud no duplica el registro. Tras guardar, cada persona recibe
un enlace personal (parámetro `registro`) para volver a abrir su respuesta y cambiar de Sí a No
o de No a Sí. El enlace general compartido sigue creando registros separados para personas distintas.
El sistema no puede saber cuántas personas recibieron el enlace; solo puede registrar
las respuestas que realmente se envían desde el formulario.

INVITACIONES PERSONALIZADAS
---------------------------
Las invitaciones personalizadas mantienen su funcionamiento anterior:
el administrador asigna nombre y cantidad de pases, genera un enlace con ID,
y guarda ese registro. La confirmación actualiza el registro de esa invitación.

PANEL ADMINISTRATIVO
--------------------
- GENERADOR: crea enlaces personalizados y el enlace general reutilizable.
- INVITADOS: consulta, copia, edita y elimina registros.
- CONFIRMACIONES: muestra las respuestas y las estadísticas.
- Al eliminar un invitado, también se elimina su fila de confirmación asociada.
- Los registros del pase general aparecen como invitados individuales con tipo
  «Pase general» y 1 pase asignado.

ACTUALIZAR EL BACKEND DE GOOGLE APPS SCRIPT
--------------------------------------------
Esta versión añade el selector Sí/No y permite cambiar después la respuesta desde
un enlace personal. El servidor debe actualizarse una vez; GitHub Pages no actualiza
el proyecto de Apps Script automáticamente.

1. Abre el proyecto de Apps Script que ya utiliza Allison Abril.
2. Abre Código.gs.
3. Reemplaza TODO el contenido de Código.gs por el archivo completo
   `apps-script/Code.gs` de este paquete. No busques ni sustituyas líneas sueltas.
4. Guarda con Ctrl+S.
5. No ejecutes setup(): esta modificación no cambia las columnas ni reinicia hojas.
   Los registros actuales, la contraseña y el ID de Google Sheets se conservan.
6. Implementar → Administrar implementaciones → lápiz (Editar) → Versión: Nueva versión
   → Implementar. Conserva la misma implementación para mantener la URL /exec.
7. La URL del servidor ya está configurada en allison-config.js; no necesitas editarla.


PRUEBAS RECOMENDADAS
--------------------
1. Panel → GENERADOR → genera un enlace de prueba personalizado → GUARDAR INVITADO.
2. Panel → INVITADOS → verifica que aparezca y prueba EDITAR y ELIMINAR.
3. Panel → GENERADOR → genera el ENLACE DE PASE GENERAL y cópialo.
4. Abre ese mismo enlace en dos navegadores/dispositivos distintos.
5. Envía una confirmación con el nombre «Prueba Uno» y otra con «Prueba Dos».
6. Panel → INVITADOS: deben aparecer dos filas distintas, ambas tipo «Pase general».
7. Panel → CONFIRMACIONES: deben aparecer las dos personas por separado.
8. Comprueba las estadísticas. Cada respuesta de pase general suma una persona.
9. Elimina los registros de prueba desde INVITADOS si ya no los necesitas.

SEGURIDAD Y LÍMITES
-------------------
- Las operaciones administrativas requieren iniciar sesión y un token temporal.
- Los enlaces públicos solo pueden registrar su propia respuesta o consultar la
  invitación individual correspondiente.
- No compartas la hoja de Google Sheets ni la contraseña administrativa.
- Quien tenga el enlace general puede enviar una respuesta. Compártelo solo con
  las personas a quienes deseas invitar.
- La apertura de WhatsApp no prueba que el mensaje haya sido enviado. La respuesta
  se cuenta cuando Google Apps Script acepta y guarda el formulario.
- Para evitar abuso, revisa periódicamente la lista y elimina entradas incorrectas
  desde el panel. Los nombres iguales son posibles en el pase general, porque pueden
  corresponder a personas diferentes.

OPTIMIZACIÓN PARA GITHUB
------------------------
Las imágenes PNG originales se convirtieron a WebP de alta calidad, conservando
transparencia y dimensiones. Los videos se recomprimieron en H.264 y la música
se recomprimió a 160 kbps. Se actualizaron las referencias en design.json,
design.js y allison-update.js.

Para publicar desde la página de GitHub:
1. Extrae este ZIP en tu computadora.
2. En GitHub abre el repositorio y elige Add file → Upload files.
3. Sube el CONTENIDO extraído, manteniendo la carpeta assets y la carpeta
   apps-script. No subas el ZIP como si fuera la página web: GitHub Pages no
   descomprime archivos ZIP.
4. Confirma el cambio (Commit changes).

Cada archivo del proyecto queda por debajo del límite habitual de 25 MB por archivo
de la interfaz web de GitHub. El ZIP es solo un paquete de transferencia.

LIMPIEZA OPCIONAL DEL REPOSITORIO
---------------------------------
El archivo README-LIMPIEZA-PNG.txt enumera los PNG antiguos que ya no son utilizados.
Si ya existían en GitHub, puedes eliminarlos después de comprobar la nueva versión.
Los archivos .webp equivalentes son los que utiliza la invitación.
