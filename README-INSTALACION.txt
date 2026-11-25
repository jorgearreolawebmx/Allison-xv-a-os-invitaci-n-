ALLISON ABRIL — INSTALACIÓN DEL SISTEMA DE INVITADOS Y CONFIRMACIONES
=====================================================================

QUÉ HAY EN ESTE PROYECTO
- index.html, script.js, design.js, styles.css, assets/ ... la invitación (sin cambios de diseño).
- allison-update.js / allison-update.css ..................... funciones añadidas (panel, pases, animaciones).
- allison-config.js ........................................... AQUÍ se pega la URL de Apps Script.
- apps-script/Code.gs ......................................... backend completo (Google Apps Script).
- README-INSTALACION.txt ...................................... este archivo.

Mientras allison-config.js tenga APPS_SCRIPT_URL vacío, la invitación funciona como antes:
el panel genera enlaces, pero NO guarda invitados ni confirmaciones. El sistema completo
queda activo al terminar los pasos siguientes. Tiempo aproximado: 15 minutos.


PASO 1 — Abrir Apps Script y pegar el código
--------------------------------------------
1. Abre el proyecto de Apps Script que usarás para Allison Abril.
2. Abre el archivo «Código.gs» (o «Code.gs»).
3. Borra su contenido y pega TODO el contenido del archivo apps-script/Code.gs incluido
   en este ZIP (también se entrega como Code.gs independiente).
4. Pulsa Guardar o Ctrl+S.

IMPORTANTE: ya NO necesitas crear una hoja de cálculo ni copiar un ID.
Al ejecutar setup(), el sistema crea automáticamente «XV Allison Abril - Invitados»
(si el proyecto no está vinculado a una hoja) y guarda su ID en las propiedades
del script. También crea las pestañas INVITADOS y CONFIRMACIONES sin borrar datos.

PASO 2 — Inicializar automáticamente
-------------------------------------
5. En el selector de funciones de la barra superior, elige «setup».
6. Pulsa «Ejecutar» y autoriza los permisos que solicite Google.
7. En «Registro de ejecución» debe aparecer «Configuración completada» y un enlace
   a la hoja de cálculo creada. Abre ese enlace para consultar las pestañas.
8. La primera ejecución configura la contraseña inicial del panel como:
      allison12345
   La contraseña queda guardada en las Propiedades del script. Si ya existía una
   propiedad ADMIN_PASSWORD, setup() la conserva y NO la reemplaza.

RECOMENDACIÓN DE SEGURIDAD: después de comprobar la instalación, puedes cambiar
ADMIN_PASSWORD en Configuración del proyecto → Propiedades del script.

PASO 5 — Publicar como aplicación web
-------------------------------------
17. Botón azul «Implementar» (arriba a la derecha) → «Nueva implementación».
18. Junto a «Seleccionar tipo», pulsa el engrane → «Aplicación web».
19. Completa:
      Descripción:          Invitación Allison v1
      Ejecutar como:        Yo (tu correo)
      Quién tiene acceso:   Cualquier usuario      ← necesario para que los invitados confirmen
20. «Implementar». Si vuelve a pedir permisos, autorízalos igual que en el paso 15.
21. Copia la «URL de la aplicación web». Tiene este formato:
      https://script.google.com/macros/s/AKfy...larguísimo.../exec


PASO 6 — Pegar la URL en la invitación
--------------------------------------
22. Abre allison-config.js (en la carpeta principal del proyecto) con un editor de texto.
23. Pega la URL entre las comillas de APPS_SCRIPT_URL:
      APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfy.../exec',
24. Recomendado: en PUBLIC_URL pega la dirección donde publicarás la invitación, por ejemplo:
      PUBLIC_URL: 'https://tu-sitio.com/allison/index.html'
    Así los enlaces que generes apuntan a la página publicada aunque abras el panel desde tu computadora.
25. Guarda el archivo y vuelve a subir la carpeta a tu hosting.


PASO 7 — Probar la conexión
---------------------------
26. Prueba rápida: abre en el navegador tu URL de Apps Script añadiendo ?action=ping al final:
      https://script.google.com/macros/s/AKfy.../exec?action=ping
    Debe responder algo como:
      {"ok":true,"data":{"version":"1.0.0","sheetsReady":true,"passwordConfigured":true}}
27. Abre la invitación publicada → baja hasta el final → toca la flor (acceso de administración)
    → escribe la contraseña del paso 10.
28. Pestaña GENERADOR: escribe «Prueba», 3 pases → GENERAR ENLACE → COPIAR ENLACE → GUARDAR INVITADO.
    Debe decir «Invitado guardado en Google Sheets» y aparecer una fila en la hoja INVITADOS.
29. Abre el enlace copiado en otro navegador o en tu celular → botón «Confirmar por WhatsApp»
    → elige 3 personas → CONFIRMAR ASISTENCIA. Debe aparecer una fila en CONFIRMACIONES.
30. En el panel, pestaña CONFIRMACIONES → ACTUALIZAR: verás los indicadores y la fila confirmada.
31. Borra las filas de prueba en la hoja cuando termines (solo las filas de datos, no los encabezados).


CÓMO FUNCIONA EL DÍA A DÍA
--------------------------
- GENERADOR: nombre + pases → GENERAR ENLACE → COPIAR → GUARDAR INVITADO.
  El enlace solo funciona cuando el invitado ya quedó guardado. Si escribes un nombre que ya existe,
  el sistema avisa y te deja editar el existente o guardarlo como nuevo (por ejemplo, dos personas con
  el mismo nombre).
- INVITADOS: lista desde Google Sheets. «Copiar» vuelve a copiar el enlace, «Ver» muestra los detalles,
  «Editar» permite cambiar nombre o pases (no se pueden asignar menos pases que personas ya confirmadas).
- CONFIRMACIONES: indicadores (registrados, confirmadas, pendientes, no asistirán, pases asignados,
  personas confirmadas) y la tabla de quién confirmó y cuántos vienen. Pulsa ACTUALIZAR para recargar.
- El invitado elige cuántas personas asistirán (nunca más de sus pases) o «No podré asistir».
  La confirmación se guarda en Google Sheets ANTES de ofrecer WhatsApp. El botón de WhatsApp es opcional:
  abrirlo no significa que el mensaje se haya enviado, y el sistema no lo cuenta como confirmación.
- Si el invitado vuelve a enviar, se actualiza su misma fila (no se duplica). Puede cambiar su respuesta
  hasta 5 veces; después debe comunicarse con la familia. Puedes editar a mano la hoja si hace falta.
- Si el servidor no responde, la invitación muestra un error y NO marca nada como guardado.


SI CAMBIAS Code.gs MÁS ADELANTE
-------------------------------
Implementar → «Administrar implementaciones» → lápiz (editar) → Versión: «Nueva versión» → Implementar.
Así la URL /exec se mantiene igual y no tienes que volver a tocar allison-config.js.
(Si en cambio creas una «Nueva implementación», la URL cambia y hay que pegarla otra vez.)


SEGURIDAD — LO QUE DEBES SABER
------------------------------
- La contraseña vive solo en las Propiedades del script (paso 10). El servidor la verifica y entrega
  una sesión temporal de 6 horas; todas las operaciones administrativas exigen esa sesión.
- Tras 8 contraseñas incorrectas, el acceso administrativo se bloquea 15 minutos para todos.
- La contraseña antigua escrita en allison-update.js solo se usa si NO hay servidor configurado.
  Con el servidor conectado no abre el panel ni da acceso a ningún dato.
- Los enlaces de invitado llevan un identificador aleatorio de 16 caracteres. Nombre y pases se leen de
  la hoja: cambiar la dirección (por ejemplo, añadir &pases=10) no cambia nada.
- Un enlace de invitado solo puede ver y confirmar SU invitación. La lista completa nunca es pública.
- «Quién tiene acceso: Cualquier usuario» es obligatorio para que los invitados confirmen sin cuenta de
  Google; el script se ejecuta con tu cuenta, así que NO compartas la hoja de cálculo con nadie que no
  deba ver los datos.
- Cualquiera que tenga el enlace de un invitado puede confirmar por él (como con cualquier invitación
  digital). Comparte cada enlace solo con su destinatario.
- Si sospechas que alguien conoce la contraseña: cámbiala en ADMIN_PASSWORD. Las sesiones abiertas
  vencen solas en máximo 6 horas.


SOLUCIÓN DE PROBLEMAS
---------------------
- «El servidor todavía no está conectado»: APPS_SCRIPT_URL está vacío en allison-config.js.
- «No se pudo conectar con el servidor»: revisa la URL (debe terminar en /exec), tu conexión, y que la
  implementación tenga acceso «Cualquier usuario».
- «El servidor no tiene contraseña de administración configurada»: falta ADMIN_PASSWORD (paso 10).
- «Falta la hoja ... Ejecuta setup()»: ejecuta setup (paso 14).
- «Falta configurar SPREADSHEET_ID»: pega el ID (paso 7) y vuelve a implementar como «Nueva versión».
- Cambiaste el código y no se nota: debes publicar una «Nueva versión» (ver sección anterior).
- El enlace generado empieza con file:/// : estás usando el panel desde tu computadora; configura
  PUBLIC_URL (paso 24) o abre el panel desde la invitación publicada.
