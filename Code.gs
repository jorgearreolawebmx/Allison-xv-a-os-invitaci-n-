/**
 * ALLISON ABRIL — Backend de invitados y confirmaciones
 * Google Apps Script + Google Sheets
 *
 * setup() crea y recuerda automáticamente la hoja de cálculo si no existe.
 *
 * Seguridad (resumen):
 *  - La contraseña de administración NO va en este archivo: se guarda en
 *    Configuración del proyecto → Propiedades del script → ADMIN_PASSWORD.
 *  - Al iniciar sesión el servidor entrega un token temporal (6 h) guardado en CacheService.
 *    Todas las operaciones administrativas exigen ese token.
 *  - Las operaciones públicas pueden consultar una invitación individual o registrar una respuesta
 *    de pase general. En el pase general, cada envío crea un invitado y una confirmación propios;
 *    ninguna operación pública devuelve la lista completa.
 *  - Los pases se leen siempre de la hoja; lo que venga en la URL no cuenta.
 */

/* ============================ CONFIGURACIÓN ============================ */

/**
 * PEGA AQUÍ el ID de tu hoja de cálculo (la parte de la URL entre /d/ y /edit).
 * Ejemplo de URL: https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
 * Si dejas el texto tal cual y el script está creado desde la propia hoja
 * (Extensiones → Apps Script), se usa esa hoja automáticamente.
 */
var SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_HOJA';

var SHEET_GUESTS = 'INVITADOS';
var SHEET_CONFIRMATIONS = 'CONFIRMACIONES';

var GUEST_HEADERS = ['ID', 'Nombre', 'Pases asignados', 'Enlace personalizado', 'Fecha de creación',
  'Estado de confirmación', 'Personas confirmadas', 'Última actualización', 'Tipo de invitación'];
var CONFIRMATION_HEADERS = ['ID de confirmación', 'ID del invitado', 'Nombre', 'Personas confirmadas',
  'Fecha de confirmación', 'Estado', 'Última actualización', 'Número de cambios', 'Clave de envío'];

var STATUS_PENDING = 'Pendiente';
var STATUS_CONFIRMED = 'Confirmado';
var STATUS_DECLINED = 'No asistirá';

var MAX_PASSES = 20;              // máximo de pases por invitado
var MAX_CONFIRMATION_CHANGES = 5; // veces que un invitado puede modificar su confirmación
var SESSION_SECONDS = 6 * 60 * 60; // duración de la sesión administrativa (máximo de CacheService)
var LOGIN_MAX_FAILS = 8;          // intentos fallidos antes de bloquear el acceso temporalmente
var LOGIN_LOCK_SECONDS = 15 * 60;
var API_VERSION = '1.2.0';
var DB_ID_PROPERTY = 'ALLISON_SPREADSHEET_ID';

/* ============================ PUNTOS DE ENTRADA ============================ */

/** GET: solo operaciones públicas de lectura. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  return handle_(function () {
    switch (p.action) {
      case 'ping': return ping_();
      case 'guest': return publicGuest_(p.id);
      case 'generalGuest': return publicGeneralGuest_(p.id);
      default: throw apiError_('UNKNOWN_ACTION', 'Acción no reconocida.');
    }
  });
}

/** POST: cuerpo JSON (enviado como text/plain para evitar la verificación previa CORS). */
function doPost(e) {
  return handle_(function () {
    var body;
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
    catch (err) { throw apiError_('BAD_REQUEST', 'La solicitud no es JSON válido.'); }
    switch (body.action) {
      case 'login': return login_(body.password);
      case 'logout': return logout_(body.token);
      case 'saveGuest': requireAdmin_(body.token); return saveGuest_(body);
      case 'deleteGuest': requireAdmin_(body.token); return deleteGuest_(body.id);
      case 'listGuests': requireAdmin_(body.token); return { guests: listGuests_() };
      case 'getGuest': requireAdmin_(body.token); return { guest: adminGuest_(body.id) };
      case 'listConfirmations': requireAdmin_(body.token); return listConfirmations_();
      case 'stats': requireAdmin_(body.token); return { stats: stats_(listGuests_()) };
      case 'confirm': return confirm_(body);
      case 'confirmGeneral': return confirmGeneral_(body);
      case 'guest': return publicGuest_(body.id);
      case 'ping': return ping_();
      default: throw apiError_('UNKNOWN_ACTION', 'Acción no reconocida.');
    }
  });
}

/* ============================ INICIALIZACIÓN ============================ */

/**
 * Ejecuta esta función UNA VEZ desde el editor (menú de funciones → setup → Ejecutar).
 * Crea las hojas y encabezados que falten. Nunca borra datos existentes.
 */
function setup() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var ss;
  try {
    ss = getSpreadsheet_();
    ensureSheet_(ss, SHEET_GUESTS, GUEST_HEADERS);
    ensureSheet_(ss, SHEET_CONFIRMATIONS, CONFIRMATION_HEADERS);

    // Conserva la contraseña existente. Si falta, genera una temporal aleatoria una sola vez.
    var props = PropertiesService.getScriptProperties();
    if (!props.getProperty('ADMIN_PASSWORD')) {
      var generatedPassword = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().slice(0, 8);
      props.setProperty('ADMIN_PASSWORD', generatedPassword);
      Logger.log('Se generó una contraseña administrativa temporal. Guárdala ahora: ' + generatedPassword);
    }
  } finally { lock.releaseLock(); }

  var msg = 'Configuración completada. Hojas listas: ' + SHEET_GUESTS + ' y ' + SHEET_CONFIRMATIONS +
    '. Columnas adicionales verificadas sin borrar registros existentes. La contraseña administrativa está configurada. ' +
    'Hoja de cálculo: ' + ss.getUrl();
  Logger.log(msg);
  Logger.log('ID de la hoja (guardado automáticamente): ' + ss.getId());
  return msg;
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  var current = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  if (!current.some(function (h) { return h.trim(); })) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // Añade al final solo los encabezados que falten; no mueve ni borra columnas.
    var missing = headers.filter(function (h) { return current.indexOf(h) < 0; });
    if (missing.length) sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  return sh;
}

/* ============================ SESIÓN ADMINISTRATIVA ============================ */

function login_(password) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('ADMIN_PASSWORD');
  if (!expected) throw apiError_('NOT_CONFIGURED', 'El servidor no tiene contraseña de administración configurada.');
  var cache = CacheService.getScriptCache();
  var fails = parseInt(cache.get('login_fails') || '0', 10);
  if (fails >= LOGIN_MAX_FAILS) throw apiError_('LOCKED', 'Demasiados intentos fallidos. Espera 15 minutos.');
  if (typeof password !== 'string' || !safeEquals_(password, expected)) {
    cache.put('login_fails', String(fails + 1), LOGIN_LOCK_SECONDS);
    Utilities.sleep(400);
    throw apiError_('BAD_PASSWORD', 'Contraseña incorrecta.');
  }
  cache.remove('login_fails');
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put('session_' + token, '1', SESSION_SECONDS);
  return { token: token, expiresIn: SESSION_SECONDS };
}

function logout_(token) {
  if (isToken_(token)) CacheService.getScriptCache().remove('session_' + token);
  return { loggedOut: true };
}

function requireAdmin_(token) {
  if (!isToken_(token) || CacheService.getScriptCache().get('session_' + token) !== '1') {
    throw apiError_('UNAUTHORIZED', 'Sesión no válida o vencida. Vuelve a iniciar sesión.');
  }
}

function isToken_(t) { return typeof t === 'string' && /^[a-f0-9]{64}$/.test(t); }

function safeEquals_(a, b) {
  var ha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a, Utilities.Charset.UTF_8);
  var hb = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b, Utilities.Charset.UTF_8);
  var diff = 0;
  for (var i = 0; i < ha.length; i++) diff |= (ha[i] ^ hb[i]);
  return diff === 0;
}

/* ============================ INVITADOS ============================ */

/** Crea o actualiza un invitado. Si el ID ya existe, actualiza esa fila (no duplica). */
function saveGuest_(body) {
  var nombre = cleanName_(body.nombre);
  var pases = toInt_(body.pases);
  if (!nombre) throw apiError_('INVALID_NAME', 'Escribe el nombre del invitado (máximo 80 caracteres).');
  if (!(pases >= 1 && pases <= MAX_PASSES)) throw apiError_('INVALID_PASSES', 'La cantidad de pases debe estar entre 1 y ' + MAX_PASSES + '.');
  var id = body.id ? String(body.id) : newId_();
  if (!isGuestId_(id)) throw apiError_('INVALID_ID', 'Identificador de invitado no válido.');
  var enlace = String(body.enlace || '').trim();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var t = table_(SHEET_GUESTS, GUEST_HEADERS);
    var rowIndex = findRow_(t, 'ID', id);
    var isGeneralRecord = rowIndex >= 0 && String(t.rows[rowIndex][t.col['Tipo de invitación']] || '') === 'Pase general';
    if (enlace.length > 600 || !/^(https?|file):\/\//i.test(enlace) ||
        (isGeneralRecord ? !/[?&]general=1(?:&|$)/.test(enlace) : enlace.indexOf('id=' + id) < 0)) {
      throw apiError_('INVALID_LINK', 'El enlace no corresponde al tipo de invitación de este registro.');
    }
    var now = new Date();
    if (rowIndex < 0) {
      // Evita duplicados accidentales: mismo nombre con otro ID.
      if (!body.force) {
        var key = nameKey_(nombre);
        for (var i = 0; i < t.rows.length; i++) {
          if (String(t.rows[i][t.col['Tipo de invitación']] || 'Personalizada') !== 'Pase general' && nameKey_(t.rows[i][t.col['Nombre']]) === key) {
            var existing = guestFromRow_(t, t.rows[i]);
            var err = apiError_('DUPLICATE_NAME', 'Ya existe un invitado con ese nombre.');
            err.data = { existing: existing };
            throw err;
          }
        }
      }
      var row = blankRow_(t);
      row[t.col['ID']] = id;
      row[t.col['Nombre']] = sheetText_(nombre);
      row[t.col['Pases asignados']] = pases;
      row[t.col['Enlace personalizado']] = sheetText_(enlace);
      row[t.col['Fecha de creación']] = now;
      row[t.col['Estado de confirmación']] = STATUS_PENDING;
      row[t.col['Personas confirmadas']] = 0;
      row[t.col['Última actualización']] = now;
      row[t.col['Tipo de invitación']] = 'Personalizada';
      t.sheet.appendRow(row);
      return { created: true, guest: guestFromRow_(t, row) };
    }
    var current = t.rows[rowIndex];
    var confirmed = toInt_(current[t.col['Personas confirmadas']]) || 0;
    if (pases < confirmed) throw apiError_('PASSES_BELOW_CONFIRMED', 'Este invitado ya confirmó ' + confirmed + ' persona(s); no puedes asignarle menos pases.');
    current[t.col['Nombre']] = sheetText_(nombre);
    current[t.col['Pases asignados']] = pases;
    current[t.col['Enlace personalizado']] = sheetText_(enlace);
    current[t.col['Última actualización']] = now;
    if (!String(current[t.col['Tipo de invitación']] || '').trim()) current[t.col['Tipo de invitación']] = 'Personalizada';
    writeRow_(t, rowIndex, current);
    // Mantiene el nombre de la confirmación sincronizado, si existe.
    var c = table_(SHEET_CONFIRMATIONS, CONFIRMATION_HEADERS);
    var ci = findRow_(c, 'ID del invitado', id);
    if (ci >= 0) { c.rows[ci][c.col['Nombre']] = sheetText_(nombre); writeRow_(c, ci, c.rows[ci]); }
    return { created: false, guest: guestFromRow_(t, current) };
  } finally { lock.releaseLock(); }
}

function listGuests_() {
  var t = table_(SHEET_GUESTS, GUEST_HEADERS);
  return t.rows.filter(function (r) { return String(r[t.col['ID']]).trim(); })
    .map(function (r) { return guestFromRow_(t, r); });
}

/** Elimina un registro de invitado y sus confirmaciones relacionadas. Requiere sesión admin. */
function deleteGuest_(id) {
  id = String(id || '');
  if (!isGuestId_(id)) throw apiError_('INVALID_ID', 'Identificador de invitado no válido.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var guests = table_(SHEET_GUESTS, GUEST_HEADERS);
    var gi = findRow_(guests, 'ID', id);
    if (gi < 0) throw apiError_('NOT_FOUND', 'El registro ya no existe o fue eliminado.');
    var confirmations = table_(SHEET_CONFIRMATIONS, CONFIRMATION_HEADERS);
    var rowsToDelete = [];
    for (var i = 0; i < confirmations.rows.length; i++) {
      if (String(confirmations.rows[i][confirmations.col['ID del invitado']]) === id) rowsToDelete.push(i + 2);
    }
    rowsToDelete.sort(function (a, b) { return b - a; }).forEach(function (rowNumber) {
      confirmations.sheet.deleteRow(rowNumber);
    });
    guests.sheet.deleteRow(gi + 2);
    return { deleted: true, id: id };
  } finally { lock.releaseLock(); }
}

function adminGuest_(id) {
  if (!isGuestId_(id)) throw apiError_('INVALID_ID', 'Identificador no válido.');
  var t = table_(SHEET_GUESTS, GUEST_HEADERS);
  var i = findRow_(t, 'ID', id);
  if (i < 0) throw apiError_('NOT_FOUND', 'Invitado no encontrado.');
  return guestFromRow_(t, t.rows[i]);
}

/** Vista pública: solo los datos de ESE invitado, sin enlace ni fechas internas. */
function publicGuest_(id) {
  if (!isGuestId_(id)) throw apiError_('INVALID_ID', 'Enlace de invitación no válido.');
  var t = table_(SHEET_GUESTS, GUEST_HEADERS);
  var i = findRow_(t, 'ID', id);
  if (i < 0) throw apiError_('NOT_FOUND', 'No encontramos esta invitación. Verifica tu enlace.');
  var g = guestFromRow_(t, t.rows[i]);
  return { guest: { id: g.id, nombre: g.nombre, pases: g.pases, estado: g.estado, personas: g.personas } };
}

/** Recupera únicamente una respuesta de PASE GENERAL para permitir que su titular la actualice. */
function publicGeneralGuest_(id) {
  if (!isGuestId_(id)) throw apiError_('INVALID_ID', 'Enlace personal no válido.');
  var t = table_(SHEET_GUESTS, GUEST_HEADERS);
  var i = findRow_(t, 'ID', id);
  if (i < 0) throw apiError_('NOT_FOUND', 'No encontramos esta respuesta. Verifica tu enlace personal.');
  var g = guestFromRow_(t, t.rows[i]);
  if (g.tipo !== 'Pase general') throw apiError_('NOT_GENERAL', 'Este enlace no corresponde a un pase general.');
  return { guest: { id: g.id, nombre: g.nombre, pases: 1, estado: g.estado, personas: g.personas, tipo: g.tipo } };
}

/* ============================ CONFIRMACIONES ============================ */

/** Registra o actualiza la confirmación de un invitado (una fila por invitado). */
function confirm_(body) {
  var id = String(body.id || '');
  if (!isGuestId_(id)) throw apiError_('INVALID_ID', 'Enlace de invitación no válido.');
  var personas = toInt_(body.personas);
  if (!(personas >= 0)) throw apiError_('INVALID_COUNT', 'Indica cuántas personas asistirán.');
  var deadline = PropertiesService.getScriptProperties().getProperty('CONFIRMATION_DEADLINE');
  if (deadline && new Date() > new Date(deadline)) throw apiError_('CLOSED', 'El periodo de confirmación ya terminó.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var g = table_(SHEET_GUESTS, GUEST_HEADERS);
    var gi = findRow_(g, 'ID', id);
    if (gi < 0) throw apiError_('NOT_FOUND', 'No encontramos esta invitación. Verifica tu enlace.');
    var guestRow = g.rows[gi];
    var pases = toInt_(guestRow[g.col['Pases asignados']]) || 0;
    if (personas > pases) throw apiError_('TOO_MANY', 'Tu invitación incluye ' + pases + ' pase(s); no puedes confirmar ' + personas + ' personas.');
    var estado = personas > 0 ? STATUS_CONFIRMED : STATUS_DECLINED;
    var nombre = String(guestRow[g.col['Nombre']]);
    var now = new Date();

    var c = table_(SHEET_CONFIRMATIONS, CONFIRMATION_HEADERS);
    var ci = findRow_(c, 'ID del invitado', id);
    var updated = ci >= 0, row;
    if (updated) {
      row = c.rows[ci];
      var changes = toInt_(row[c.col['Número de cambios']]) || 0;
      var same = toInt_(row[c.col['Personas confirmadas']]) === personas && String(row[c.col['Estado']]) === estado;
      if (!same) {
        if (changes >= MAX_CONFIRMATION_CHANGES) throw apiError_('TOO_MANY_CHANGES', 'Ya modificaste tu confirmación varias veces. Comunícate con la familia para cambiarla.');
        row[c.col['Personas confirmadas']] = personas;
        row[c.col['Estado']] = estado;
        row[c.col['Nombre']] = sheetText_(nombre);
        row[c.col['Última actualización']] = now;
        row[c.col['Número de cambios']] = changes + 1;
        writeRow_(c, ci, row);
      }
    } else {
      row = blankRow_(c);
      row[c.col['ID de confirmación']] = 'C-' + newId_();
      row[c.col['ID del invitado']] = id;
      row[c.col['Nombre']] = sheetText_(nombre);
      row[c.col['Personas confirmadas']] = personas;
      row[c.col['Fecha de confirmación']] = now;
      row[c.col['Estado']] = estado;
      row[c.col['Última actualización']] = now;
      row[c.col['Número de cambios']] = 0;
      c.sheet.appendRow(row);
    }
    guestRow[g.col['Estado de confirmación']] = estado;
    guestRow[g.col['Personas confirmadas']] = personas;
    guestRow[g.col['Última actualización']] = now;
    writeRow_(g, gi, guestRow);
    return {
      updated: updated,
      guest: { id: id, nombre: nombre, pases: pases, estado: estado, personas: personas },
      confirmation: confirmationFromRow_(c, row)
    };
  } finally { lock.releaseLock(); }
}


/**
 * Pase general reutilizable:
 * cada envío válido crea un invitado individual y una confirmación individual.
 * El enlace es compartido, pero los registros NO se sobrescriben entre sí.
 * submissionId hace idempotente un reintento de la misma operación.
 */
function confirmGeneral_(body) {
  var nombre = cleanName_(body.nombre);
  if (!nombre) throw apiError_('INVALID_NAME', 'Escribe tu nombre completo para confirmar.');
  var personas = toInt_(body.personas);
  if (!(personas === 0 || personas === 1)) throw apiError_('INVALID_COUNT', 'El pase general corresponde a una sola persona.');
  var submissionId = String(body.submissionId || '');
  if (!/^[A-Za-z0-9]{16,64}$/.test(submissionId)) throw apiError_('INVALID_REQUEST', 'No se pudo validar este envío. Actualiza la página e inténtalo de nuevo.');
  var deadline = PropertiesService.getScriptProperties().getProperty('CONFIRMATION_DEADLINE');
  if (deadline && new Date() > new Date(deadline)) throw apiError_('CLOSED', 'El periodo de confirmación ya terminó.');

  var enlace = String(body.enlace || '').trim();
  if (enlace.length > 600 || !/^https:\/\/\S+/i.test(enlace) || !/[?&]general=1(?:&|$)/.test(enlace)) {
    throw apiError_('INVALID_LINK', 'El enlace de pase general no es válido.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var guests = table_(SHEET_GUESTS, GUEST_HEADERS);
    var confirmations = table_(SHEET_CONFIRMATIONS, CONFIRMATION_HEADERS);

    // Idempotencia: si el mismo envío se repite por un fallo de red, devolver el resultado anterior.
    var previousIndex = findRow_(confirmations, 'Clave de envío', submissionId);
    if (previousIndex >= 0) {
      var previous = confirmationFromRow_(confirmations, confirmations.rows[previousIndex]);
      var previousGuestIndex = findRow_(guests, 'ID', previous.invitadoId);
      if (previousGuestIndex >= 0) {
        return {
          duplicateRequest: true,
          updated: !!body.id,
          guest: guestFromRow_(guests, guests.rows[previousGuestIndex]),
          confirmation: previous
        };
      }
    }

    var now = new Date();
    var estado = personas === 1 ? STATUS_CONFIRMED : STATUS_DECLINED;
    var recordId = String(body.id || '').trim();

    // ACTUALIZACIÓN: un enlace personal (registro=ID) solo puede modificar su propio pase general.
    if (recordId) {
      if (!isGuestId_(recordId)) throw apiError_('INVALID_ID', 'El enlace personal no es válido.');
      var gi = findRow_(guests, 'ID', recordId);
      if (gi < 0) throw apiError_('NOT_FOUND', 'No encontramos tu respuesta guardada.');
      var guestRow = guests.rows[gi];
      if (String(guestRow[guests.col['Tipo de invitación']] || '') !== 'Pase general') {
        throw apiError_('NOT_GENERAL', 'Esta respuesta no pertenece a un pase general.');
      }
      var existingName = String(guestRow[guests.col['Nombre']] || '');
      var cIndex = findRow_(confirmations, 'ID del invitado', recordId);
      var confirmationRow;
      var updated = true;
      if (cIndex >= 0) {
        confirmationRow = confirmations.rows[cIndex];
        var oldPeople = toInt_(confirmationRow[confirmations.col['Personas confirmadas']]);
        var oldState = String(confirmationRow[confirmations.col['Estado']] || '');
        var oldName = String(confirmationRow[confirmations.col['Nombre']] || '');
        var changed = oldPeople !== personas || oldState !== estado || oldName !== nombre;
        confirmationRow[confirmations.col['Nombre']] = sheetText_(nombre);
        confirmationRow[confirmations.col['Personas confirmadas']] = personas;
        confirmationRow[confirmations.col['Estado']] = estado;
        confirmationRow[confirmations.col['Última actualización']] = now;
        confirmationRow[confirmations.col['Clave de envío']] = submissionId;
        if (changed) confirmationRow[confirmations.col['Número de cambios']] = (toInt_(confirmationRow[confirmations.col['Número de cambios']]) || 0) + 1;
        writeRow_(confirmations, cIndex, confirmationRow);
      } else {
        confirmationRow = blankRow_(confirmations);
        confirmationRow[confirmations.col['ID de confirmación']] = 'C-' + newId_();
        confirmationRow[confirmations.col['ID del invitado']] = recordId;
        confirmationRow[confirmations.col['Nombre']] = sheetText_(nombre);
        confirmationRow[confirmations.col['Personas confirmadas']] = personas;
        confirmationRow[confirmations.col['Fecha de confirmación']] = now;
        confirmationRow[confirmations.col['Estado']] = estado;
        confirmationRow[confirmations.col['Última actualización']] = now;
        confirmationRow[confirmations.col['Número de cambios']] = 1;
        confirmationRow[confirmations.col['Clave de envío']] = submissionId;
        confirmations.sheet.appendRow(confirmationRow);
        cIndex = confirmations.rows.length;
      }
      guestRow[guests.col['Nombre']] = sheetText_(nombre);
      guestRow[guests.col['Estado de confirmación']] = estado;
      guestRow[guests.col['Personas confirmadas']] = personas;
      guestRow[guests.col['Última actualización']] = now;
      writeRow_(guests, gi, guestRow);
      return {
        duplicateRequest: false,
        updated: updated,
        guest: guestFromRow_(guests, guestRow),
        confirmation: confirmationFromRow_(confirmations, confirmationRow)
      };
    }

    // ALTA NUEVA: el enlace general es compartido, pero cada envío crea una persona independiente.
    var id = newId_();
    var newGuestRow = blankRow_(guests);
    newGuestRow[guests.col['ID']] = id;
    newGuestRow[guests.col['Nombre']] = sheetText_(nombre);
    newGuestRow[guests.col['Pases asignados']] = 1;
    newGuestRow[guests.col['Enlace personalizado']] = sheetText_(enlace);
    newGuestRow[guests.col['Fecha de creación']] = now;
    newGuestRow[guests.col['Estado de confirmación']] = estado;
    newGuestRow[guests.col['Personas confirmadas']] = personas;
    newGuestRow[guests.col['Última actualización']] = now;
    newGuestRow[guests.col['Tipo de invitación']] = 'Pase general';
    guests.sheet.appendRow(newGuestRow);

    var newConfirmationRow = blankRow_(confirmations);
    newConfirmationRow[confirmations.col['ID de confirmación']] = 'C-' + newId_();
    newConfirmationRow[confirmations.col['ID del invitado']] = id;
    newConfirmationRow[confirmations.col['Nombre']] = sheetText_(nombre);
    newConfirmationRow[confirmations.col['Personas confirmadas']] = personas;
    newConfirmationRow[confirmations.col['Fecha de confirmación']] = now;
    newConfirmationRow[confirmations.col['Estado']] = estado;
    newConfirmationRow[confirmations.col['Última actualización']] = now;
    newConfirmationRow[confirmations.col['Número de cambios']] = 0;
    newConfirmationRow[confirmations.col['Clave de envío']] = submissionId;
    confirmations.sheet.appendRow(newConfirmationRow);

    return {
      duplicateRequest: false,
      updated: false,
      guest: guestFromRow_(guests, newGuestRow),
      confirmation: confirmationFromRow_(confirmations, newConfirmationRow)
    };
  } finally { lock.releaseLock(); }
}

function listConfirmations_() {
  var guests = listGuests_();
  var c = table_(SHEET_CONFIRMATIONS, CONFIRMATION_HEADERS);
  var byGuest = {};
  c.rows.forEach(function (r) { var k = String(r[c.col['ID del invitado']]); if (k) byGuest[k] = confirmationFromRow_(c, r); });
  var list = guests.map(function (g) {
    var conf = byGuest[g.id] || null;
    return { id: g.id, nombre: g.nombre, pases: g.pases, estado: g.estado, personas: g.personas, tipo: g.tipo,
      fechaConfirmacion: conf ? conf.fecha : '', actualizado: conf ? conf.actualizado : '', cambios: conf ? conf.cambios : 0 };
  });
  return { confirmations: list, stats: stats_(guests) };
}

function stats_(guests) {
  var s = { invitados: guests.length, confirmados: 0, pendientes: 0, noAsistiran: 0, pasesAsignados: 0, personasConfirmadas: 0 };
  guests.forEach(function (g) {
    s.pasesAsignados += g.pases;
    if (g.estado === STATUS_CONFIRMED) { s.confirmados++; s.personasConfirmadas += g.personas; }
    else if (g.estado === STATUS_DECLINED) s.noAsistiran++;
    else s.pendientes++;
  });
  return s;
}

/* ============================ UTILIDADES ============================ */

function ping_() {
  var ss = getSpreadsheet_();
  return {
    version: API_VERSION,
    sheetsReady: !!(ss.getSheetByName(SHEET_GUESTS) && ss.getSheetByName(SHEET_CONFIRMATIONS)),
    passwordConfigured: !!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')
  };
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();

  // 1) Si el usuario ya indicó un ID fijo en el código, respetarlo.
  if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('PEGA_AQUI') !== 0) {
    var fixed = SpreadsheetApp.openById(SPREADSHEET_ID);
    props.setProperty(DB_ID_PROPERTY, fixed.getId());
    return fixed;
  }

  // 2) Reutilizar la hoja que este proyecto creó o vinculó anteriormente.
  var savedId = props.getProperty(DB_ID_PROPERTY);
  if (savedId) return SpreadsheetApp.openById(savedId);

  // 3) Si el script está vinculado a una hoja, usarla.
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty(DB_ID_PROPERTY, active.getId());
    return active;
  }

  // 4) Si es un proyecto independiente, crear la hoja automáticamente.
  var created = SpreadsheetApp.create('XV Allison Abril - Invitados');
  props.setProperty(DB_ID_PROPERTY, created.getId());
  return created;
}

/** Lee una hoja completa y devuelve filas + mapa de columnas por encabezado. */
function table_(name, headers) {
  var sh = getSpreadsheet_().getSheetByName(name);
  if (!sh) throw apiError_('NOT_CONFIGURED', 'Falta la hoja ' + name + '. Ejecuta setup() en Apps Script.');
  var values = sh.getDataRange().getValues();
  var head = (values[0] || []).map(String);
  var col = {};
  headers.forEach(function (h) {
    var i = head.indexOf(h);
    if (i < 0) throw apiError_('NOT_CONFIGURED', 'Falta la columna «' + h + '» en ' + name + '. Ejecuta setup().');
    col[h] = i;
  });
  return { sheet: sh, col: col, width: head.length, rows: values.slice(1) };
}

function findRow_(t, header, value) {
  var c = t.col[header], v = String(value);
  for (var i = 0; i < t.rows.length; i++) if (String(t.rows[i][c]) === v) return i;
  return -1;
}

function blankRow_(t) { var r = []; for (var i = 0; i < t.width; i++) r.push(''); return r; }

function writeRow_(t, rowIndex, row) { t.sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]); }

function guestFromRow_(t, r) {
  return {
    id: String(r[t.col['ID']]),
    nombre: String(r[t.col['Nombre']]),
    pases: toInt_(r[t.col['Pases asignados']]) || 0,
    enlace: String(r[t.col['Enlace personalizado']]),
    creado: iso_(r[t.col['Fecha de creación']]),
    estado: String(r[t.col['Estado de confirmación']] || STATUS_PENDING),
    personas: toInt_(r[t.col['Personas confirmadas']]) || 0,
    actualizado: iso_(r[t.col['Última actualización']]),
    tipo: String(r[t.col['Tipo de invitación']] || 'Personalizada')
  };
}

function confirmationFromRow_(c, r) {
  return {
    id: String(r[c.col['ID de confirmación']]),
    invitadoId: String(r[c.col['ID del invitado']]),
    nombre: String(r[c.col['Nombre']]),
    personas: toInt_(r[c.col['Personas confirmadas']]) || 0,
    fecha: iso_(r[c.col['Fecha de confirmación']]),
    estado: String(r[c.col['Estado']]),
    actualizado: iso_(r[c.col['Última actualización']]),
    cambios: toInt_(r[c.col['Número de cambios']]) || 0,
    submissionId: String(r[c.col['Clave de envío']] || '')
  };
}

function newId_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
  var out = '';
  for (var i = 0; i < 16; i++) out += chars.charAt((bytes[i] + 256) % chars.length);
  return out;
}

function isGuestId_(id) { return typeof id === 'string' && /^[A-Za-z0-9]{12,32}$/.test(id); }

function cleanName_(v) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return s.length >= 1 && s.length <= 80 ? s : '';
}

/** Evita que un texto se interprete como fórmula en la hoja. */
function sheetText_(s) { s = String(s); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function nameKey_(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function toInt_(v) {
  if (typeof v === 'number') return Math.floor(v) === v ? v : NaN;
  if (typeof v === 'string' && /^\s*\d{1,4}\s*$/.test(v)) return parseInt(v, 10);
  return NaN;
}

function iso_(d) { return d instanceof Date && !isNaN(d) ? d.toISOString() : (d ? String(d) : ''); }

function apiError_(code, message) { var e = new Error(message); e.code = code; return e; }

function handle_(fn) {
  var out;
  try { out = { ok: true, data: fn() }; }
  catch (err) {
    out = err && err.code
      ? { ok: false, error: err.code, message: err.message, data: err.data || null }
      : { ok: false, error: 'SERVER_ERROR', message: 'Error interno del servidor. Intenta de nuevo.' };
    if (!(err && err.code)) console.error(err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
