/* Actualización funcional Allison Abril — capa adicional sin alterar los objetos originales. */
(function () {
  'use strict';
  var PASSWORD = 'allison12345';
  var WA_NUMBER = '2284104065';
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var el = function (tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
  var esc = function (s) { return String(s == null ? '' : s); };
  var CFG = window.ALLISON_CONFIG || {};
  var API_URL = String(CFG.APPS_SCRIPT_URL || '').trim();
  var BACKEND = /^https?:\/\/\S+$/.test(API_URL);
  /** Llama al backend de Apps Script. Devuelve los datos o lanza {code, message, data}. */
  function api(action, payload, useGet) {
    if (!BACKEND) return Promise.reject({ code: 'NO_BACKEND', message: 'El servidor todavía no está conectado (falta la URL de Apps Script en allison-config.js).' });
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;
    var req;
    if (useGet) {
      var q = new URLSearchParams(Object.assign({ action: action }, payload || {}));
      req = fetch(API_URL + (API_URL.indexOf('?') < 0 ? '?' : '&') + q.toString(), { method: 'GET', redirect: 'follow', signal: ctrl && ctrl.signal });
    } else {
      req = fetch(API_URL, { method: 'POST', redirect: 'follow', signal: ctrl && ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, payload || {})) });
    }
    return req.then(function (r) { return r.json(); }, function () {
      throw { code: 'NETWORK', message: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' };
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res || res.ok !== true) throw { code: (res && res.error) || 'BAD_RESPONSE', message: (res && res.message) || 'Respuesta no válida del servidor.', data: res && res.data };
      return res.data;
    }, function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.code) throw err;
      throw { code: 'BAD_RESPONSE', message: 'El servidor respondió de forma inesperada. Verifica la URL de Apps Script.' };
    });
  }
  function randomId(len) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', out = '', buf = new Uint32Array(len);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < len; i++) out += chars.charAt(buf[i] % chars.length);
    return out;
  }
  function init() {
    if (document.documentElement.dataset.allisonUpdated === '1') return;
    var intro = $('[data-workspace="intro"]');
    var invitation = $('[data-workspace="invitation"]');
    var introHost = $('#iv-intro');
    if (!intro || !invitation || !introHost) return;
    document.documentElement.dataset.allisonUpdated = '1';

    var params = new URLSearchParams(location.search);
    function generalPublicUrl() {
      var u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('general', '1'); return u.href;
    }
    var guestName = (params.get('invitado') || '').trim();
    var passCount = Math.max(1, Math.min(20, parseInt(params.get('pases') || '0', 10) || 0));
    var guestId = (params.get('id') || '').trim();
    var generalPass = params.get('general') === '1';
    var generalRecordId = (params.get('registro') || '').trim();
    if (!/^[A-Za-z0-9]{12,32}$/.test(guestId)) guestId = '';
    if (!/^[A-Za-z0-9]{12,32}$/.test(generalRecordId)) generalRecordId = '';
    // Enlaces personalizados usan un ID del servidor; el pase general es un enlace compartido que crea un registro por persona.
    var serverGuest = !!(guestId && BACKEND);
    if (generalPass) { guestName = 'PASE GENERAL'; passCount = 1; }
    var personalized = generalPass || serverGuest || (!!guestName && passCount > 0);
    var guestData = null, guestLoad = null, loadGuest = function () { return Promise.reject({ code: 'NO_GUEST', message: 'Invitación no disponible.' }); };

    // Portada: zona táctil invisible exactamente sobre el sello del video original.
    var hint = el('div', 'allison-seal-hint', 'Toca el sello para abrir');
    var seal = el('button', 'allison-seal-hotspot');
    seal.type = 'button'; seal.setAttribute('aria-label', 'Toca el sello para abrir');
    seal.style.left = '385px'; seal.style.top = '690px'; seal.style.width = '310px'; seal.style.height = '310px';
    hint.style.left = '170px'; hint.style.top = '1110px'; hint.style.width = '740px';
    intro.appendChild(seal); intro.appendChild(hint);
    // «SALTAR INTRO»: usa el salto propio del runtime; la apertura por el sello sigue igual.
    var skip = el('button', 'allison-skip-intro', 'SALTAR INTRO'); skip.type = 'button';
    skip.setAttribute('aria-label', 'Saltar la animación del sobre y entrar a la invitación');
    skip.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (!window.WedditStudio || window.WedditStudio.isOpen()) return;
      if (window.WedditStudio.intro && window.WedditStudio.intro.skip) window.WedditStudio.intro.skip(); else window.WedditStudio.open();
    });
    introHost.appendChild(skip);
    introHost.addEventListener('click', function (ev) {
      if (!seal.contains(ev.target) && !skip.contains(ev.target)) { ev.preventDefault(); ev.stopPropagation(); }
    }, true);
    seal.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (window.WedditStudio) window.WedditStudio.open();
    });
    seal.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seal.click(); } });

    // Reservar una franja inicial para la identificación y los pases personalizados.
    // Se desplazan juntas las capas originales para conservar intacta su composición relativa.
    var invitationLayers = Array.prototype.slice.call(invitation.querySelectorAll(':scope > .iv-layer'));
    // Margen superior breve; con pase personalizado se abre un hueco bajo el logotipo para el pase y el nombre.
    var passIntroHeight = 0, passGap = personalized ? 210 : 0, afterLogoY = 800;
    var rsvpGapCut = 300, rsvpY = 7400;   // acorta el espacio vacío antes de «Confirma tu asistencia»
    var shiftUp = 750 - passIntroHeight - passGap;
    function liftUp(node, extra) { var d = shiftUp + (extra || 0); if (d) node.style.top = (parseFloat(getComputedStyle(node).top) - d) + 'px'; }
    invitationLayers.forEach(function (layer) {
      layer.style.transform = 'translateY(' + passIntroHeight + 'px)';
    });
    // Espacio para MIS PADRES y MI MADRINA justo después del cronómetro: solo se bajan los objetos
    // originales situados debajo del marco del cronómetro (portada, fecha, mensaje y cronómetro no se mueven).
    var familyBlockHeight = 1200, afterCountdownY = 1920;
    var paletteGapCut = 120, giftY = 5500;   // acorta el hueco entre la paleta de colores y el marco del regalo
    var endLift = rsvpGapCut + (1400 - familyBlockHeight) + paletteGapCut;
    invitation.querySelectorAll(':scope > .iv-layer > .iv-obj').forEach(function (obj) {
      var top = parseFloat(obj.style.top), add = 0;
      if (top >= afterLogoY) add += passGap;
      if (top >= afterCountdownY) add += familyBlockHeight;
      if (top >= giftY) add -= paletteGapCut;
      if (top >= rsvpY) add -= rsvpGapCut;
      if (add) obj.style.top = (top + add) + 'px';
    });
    invitation.style.height = (parseFloat(invitation.style.height) || 10050) + 1300 + 'px';
    var contentHost = $('#iv-content');
    function updateInvitationHeight() {
      if (!contentHost) return;
      var scale = invitation.getBoundingClientRect().width / 1080;
      contentHost.style.height = ((parseFloat(invitation.style.height) || 11350) * scale) + 'px';
    }
    updateInvitationHeight();
    window.addEventListener('resize', updateInvitationHeight);
    // Recorta al final el mismo espacio que se quitó arriba.
    if (shiftUp && contentHost) {
      var setTrimmedHeight = function () { contentHost.style.setProperty('--allison-content-h', ((11350 - shiftUp - (1400 - familyBlockHeight) - paletteGapCut) * (contentHost.clientWidth || 1) / 1080) + 'px'); };
      contentHost.classList.add('allison-trimmed'); setTrimmedHeight();
      window.addEventListener('resize', setTrimmedHeight);
      if ('ResizeObserver' in window) new ResizeObserver(setTrimmedHeight).observe(contentHost);
    }

    // La identificación y el pase se muestran antes del diseño original.
    var passCard = el('section', 'allison-pass-section');
    passCard.style.top = (passIntroHeight + 670) + 'px';
    if (personalized) {
      var passImg = el('img', 'allison-pass-art'); passImg.src = 'assets/pase_allison.webp'; passImg.alt = 'Pase de invitación'; passCard.appendChild(passImg);
      var passText = el('div', 'allison-pass-number', serverGuest ? '·' : String(passCount)); passCard.appendChild(passText);
    }
    invitation.appendChild(passCard);

    function personSection(top, imageSrc, title, names, cls) {
      var section = el('section', 'allison-person-section ' + cls);
      section.style.top = top + 'px';
      var img = el('img', 'allison-person-art'); img.src = imageSrc; img.alt = title;
      var heading = el('h2', 'allison-person-title', title);
      var name = el('p', 'allison-person-name', names);
      section.appendChild(img); section.appendChild(heading); section.appendChild(name);
      invitation.appendChild(section);
    }
    personSection(2660 - shiftUp, 'assets/padres_allison.webp', 'MIS PADRES', 'Ana Hernández Alarcón  ·  Víctor Portilla García', 'parents');
    personSection(2660 + 600 - shiftUp, 'assets/madrina_allison.webp', 'MI MADRINA', 'Isidora García Ortiz', 'godmother');

    // Mensaje final de agradecimiento, después de todas las secciones originales.
    var thanks = el('p', 'allison-thanks-message', '«Gracias por acompañarnos en este día tan especial».');
    invitation.appendChild(thanks); liftUp(thanks, endLift);

    // Ventanas emergentes.
    var overlay = el('div', 'allison-modal-overlay'); overlay.hidden = true;
    var modal = el('section', 'allison-modal'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    var close = el('button', 'allison-modal-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Cerrar');
    var body = el('div', 'allison-modal-body'); modal.appendChild(close); modal.appendChild(body); overlay.appendChild(modal); document.body.appendChild(overlay);
    var previousFocus = null;
    function showModal(content) { modal.classList.remove('allison-modal-wide'); body.replaceChildren(content); previousFocus = document.activeElement; overlay.hidden = false; document.body.classList.add('allison-modal-open'); var first = body.querySelector('input,button'); if (first) first.focus(); }
    function hideModal() { overlay.hidden = true; document.body.classList.remove('allison-modal-open'); if (previousFocus && previousFocus.focus) previousFocus.focus(); }
    close.addEventListener('click', hideModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) hideModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) hideModal(); });

    function makeField(label, placeholder, type) {
      var wrap = el('label', 'allison-field'); wrap.appendChild(el('span', '', label));
      var input = el('input'); input.type = type || 'text'; input.placeholder = placeholder || ''; input.autocomplete = 'off'; wrap.appendChild(input); return { wrap: wrap, input: input };
    }
    function button(text, cls, fn) { var b = el('button', cls || 'allison-btn', text); b.type = 'button'; b.addEventListener('click', fn); return b; }

    function waLink(msg) { return 'https://wa.me/52' + WA_NUMBER + '?text=' + encodeURIComponent(msg); }
    // Confirmación registrada en Google Sheets (enlaces con ID). WhatsApp queda como aviso opcional:
    // abrirlo no demuestra que el mensaje se haya enviado, por eso la confirmación la decide el servidor.
    function openServerRsvp() {
      var box = el('div', 'allison-form'); box.appendChild(el('h2', '', 'CONFIRMA TU ASISTENCIA'));
      showModal(box);
      function render(g) {
        var status = el('p', 'allison-status', ''); status.setAttribute('role', 'status');
        box.replaceChildren(el('h2', '', 'CONFIRMA TU ASISTENCIA'));
        box.appendChild(el('p', 'allison-rsvp-guest', g.nombre));
        box.appendChild(el('p', 'allison-help allison-center', 'Tu invitación incluye ' + g.pases + (g.pases === 1 ? ' pase.' : ' pases.')));
        if (g.estado === 'Confirmado') box.appendChild(el('p', 'allison-note', 'Ya confirmaste ' + g.personas + (g.personas === 1 ? ' persona' : ' personas') + '. Si lo necesitas, puedes actualizar tu respuesta.'));
        if (g.estado === 'No asistirá') box.appendChild(el('p', 'allison-note', 'Registraste que no podrás asistir. Si cambiaste de planes, puedes actualizar tu respuesta.'));
        var wrap = el('label', 'allison-field'); wrap.appendChild(el('span', '', '¿Cuántas personas asistirán?'));
        var sel = el('select', 'allison-select');
        for (var i = 1; i <= g.pases; i++) { var o = el('option', '', i + (i === 1 ? ' persona' : ' personas')); o.value = String(i); sel.appendChild(o); }
        var no = el('option', '', 'No podré asistir'); no.value = '0'; sel.appendChild(no);
        sel.value = String(g.estado === 'No asistirá' ? 0 : (g.personas || g.pases));
        wrap.appendChild(sel); box.appendChild(wrap);
        var label = g.estado === 'Pendiente' ? 'CONFIRMAR ASISTENCIA' : 'ACTUALIZAR RESPUESTA';
        var send = button(label, 'allison-btn allison-btn-primary', function () {
          var n = parseInt(sel.value, 10);
          if (!(n >= 0 && n <= g.pases)) { status.className = 'allison-status is-error'; status.textContent = 'La cantidad no puede superar tus pases.'; return; }
          send.disabled = true; send.textContent = 'ENVIANDO…'; status.className = 'allison-status'; status.textContent = '';
          api('confirm', { id: guestId, personas: n }).then(function (res) {
            guestData = res.guest; done(res.guest, res.updated);
          }, function (err) {
            send.disabled = false; send.textContent = label;
            status.className = 'allison-status is-error'; status.textContent = err.message + ' Tu respuesta no se guardó.';
          });
        });
        box.appendChild(send); box.appendChild(status);
      }
      function done(g, updated) {
        box.replaceChildren(el('h2', '', g.personas > 0 ? '¡GRACIAS!' : 'RESPUESTA REGISTRADA'));
        box.appendChild(el('p', 'allison-status is-ok', updated ? 'Tu respuesta se actualizó correctamente.' : '¡Tu confirmación quedó registrada!'));
        box.appendChild(el('p', 'allison-help allison-center', g.personas > 0
          ? g.nombre + ': ' + g.personas + (g.personas === 1 ? ' persona confirmada.' : ' personas confirmadas.')
          : g.nombre + ': registramos que no podrás asistir.'));
        var msg = g.personas > 0
          ? 'Hola, soy ' + g.nombre + '. Confirmo ' + g.personas + (g.personas === 1 ? ' persona' : ' personas') + ' para los XV años de Allison Abril.'
          : 'Hola, soy ' + g.nombre + '. Lamentablemente no podré asistir a los XV años de Allison Abril.';
        box.appendChild(button('AVISAR TAMBIÉN POR WHATSAPP', 'allison-btn', function () { window.open(waLink(msg), '_blank', 'noopener,noreferrer'); }));
        box.appendChild(el('p', 'allison-help allison-center', 'Opcional. WhatsApp se abrirá con el mensaje listo; recuerda pulsar «Enviar».'));
      }
      if (guestData) { render(guestData); return; }
      box.appendChild(el('p', 'allison-help allison-center', 'Cargando tu invitación…'));
      (guestLoad || loadGuest()).then(function () {
        if (guestData) render(guestData);
      }, function (err) {
        box.replaceChildren(el('h2', '', 'CONFIRMA TU ASISTENCIA'));
        box.appendChild(el('p', 'allison-status is-error', err.message));
        box.appendChild(button('REINTENTAR', 'allison-btn', function () { guestLoad = null; openServerRsvp(); }));
      });
    }
    // Pase general reutilizable: cada persona registra una respuesta propia.
    // Tras guardar, recibe un enlace individual para poder cambiar su respuesta más adelante.
    function openGeneralRsvp() {
      var box = el('div', 'allison-form');
      showModal(box);

      function makePersonalUrl(id) {
        var u = new URL(generalPublicUrl());
        u.searchParams.set('registro', id);
        return u.href;
      }

      function renderSuccess(g) {
        var attending = g.estado === 'Confirmado';
        var personalUrl = makePersonalUrl(g.id);
        // Conserva el ID en esta sesión y en la URL para volver a abrir el mismo registro.
        generalRecordId = g.id;
        try { history.replaceState({}, '', personalUrl); } catch (ignore) {}
        box.replaceChildren(el('h2', '', attending ? '¡GRACIAS POR CONFIRMAR!' : 'RESPUESTA REGISTRADA'));
        box.appendChild(el('p', 'allison-status is-ok', attending
          ? 'Tu asistencia quedó registrada correctamente.'
          : 'Registramos que no podrás asistir. Gracias por avisarnos.'));
        box.appendChild(el('p', 'allison-help allison-center', attending
          ? g.nombre + ': confirmaste que SÍ asistirás a los XV años de Allison Abril (1 persona).'
          : g.nombre + ': confirmaste que NO podrás asistir a los XV años de Allison Abril.'));
        var linkField = el('input', 'allison-generated-url');
        linkField.type = 'text'; linkField.readOnly = true; linkField.value = personalUrl;
        linkField.setAttribute('aria-label', 'Enlace personal para cambiar tu respuesta');
        box.appendChild(linkField);
        var copyStatus = el('p', 'allison-copy-status', 'Guarda este enlace si después necesitas cambiar tu respuesta.');
        box.appendChild(button('COPIAR MI ENLACE PERSONAL', 'allison-btn', function () {
          copyWithFeedback(personalUrl, copyStatus, linkField);
        }));
        box.appendChild(copyStatus);

        var message = attending
          ? 'Hola, soy ' + g.nombre + '. Confirmo que SÍ asistiré a los XV años de Allison Abril (1 persona).'
          : 'Hola, soy ' + g.nombre + '. Confirmo que NO podré asistir a los XV años de Allison Abril.';
        message += '\nMi enlace personal para actualizar mi respuesta: ' + personalUrl;
        box.appendChild(button('ENVIAR RESPUESTA POR WHATSAPP', 'allison-btn allison-btn-primary', function () {
          window.open(waLink(message), '_blank', 'noopener,noreferrer');
        }));
        box.appendChild(button('CAMBIAR MI RESPUESTA', 'allison-btn', function () {
          renderGeneralForm(g);
        }));
        box.appendChild(el('p', 'allison-help allison-center', 'Puedes volver a este enlace personal para cambiar tu respuesta. WhatsApp se abrirá con el mensaje listo; recuerda pulsar «Enviar».'));
      }

      function renderGeneralForm(existingGuest) {
        box.replaceChildren(el('h2', '', 'CONFIRMA TU ASISTENCIA'));
        if (existingGuest) {
          box.appendChild(el('p', 'allison-note allison-center', 'Esta es tu respuesta guardada. Puedes cambiarla cuando lo necesites.'));
        } else {
          box.appendChild(el('p', 'allison-note allison-center', 'Este enlace es compartido. Cada persona debe registrar su nombre por separado. El pase general corresponde a una persona.'));
        }

        var field = makeField('Tu nombre completo', 'Escribe tu nombre y apellidos');
        if (existingGuest) field.input.value = existingGuest.nombre || '';
        box.appendChild(field.wrap);

        var choiceLabel = el('p', 'allison-choice-label', '¿Asistirás a los XV años de Allison Abril?');
        box.appendChild(choiceLabel);
        var choice = existingGuest ? (existingGuest.estado === 'Confirmado' ? 1 : 0) : null;
        var switchWrap = el('div', 'allison-attendance-switch');
        switchWrap.setAttribute('role', 'group');
        switchWrap.setAttribute('aria-label', 'Selecciona si asistirás');
        switchWrap.setAttribute('aria-describedby', 'allison-attendance-help');
        var thumb = el('span', 'allison-attendance-thumb');
        var noBtn = button('NO PODRÉ ASISTIR', 'allison-attendance-option', function () { setChoice(0); });
        var yesBtn = button('SÍ ASISTIRÉ', 'allison-attendance-option', function () { setChoice(1); });
        noBtn.setAttribute('aria-pressed', 'false');
        yesBtn.setAttribute('aria-pressed', 'false');
        switchWrap.appendChild(thumb); switchWrap.appendChild(noBtn); switchWrap.appendChild(yesBtn);
        box.appendChild(switchWrap);
        var choiceHint = el('p', 'allison-help allison-center', choice === null ? 'Desliza el selector o toca una opción para elegir tu respuesta.' : (choice ? 'Seleccionaste: SÍ asistiré.' : 'Seleccionaste: NO podré asistir.'));
        choiceHint.id = 'allison-attendance-help'; choiceHint.setAttribute('aria-live', 'polite');
        box.appendChild(choiceHint);

        function setChoice(value) {
          choice = value;
          switchWrap.classList.toggle('is-yes', value === 1);
          switchWrap.classList.toggle('is-no', value === 0);
          noBtn.classList.toggle('is-selected', value === 0);
          yesBtn.classList.toggle('is-selected', value === 1);
          noBtn.setAttribute('aria-pressed', value === 0 ? 'true' : 'false');
          yesBtn.setAttribute('aria-pressed', value === 1 ? 'true' : 'false');
          choiceHint.textContent = value === 1 ? 'Seleccionaste: SÍ asistiré.' : 'Seleccionaste: NO podré asistir.';
        }
        switchWrap.addEventListener('pointerup', function (ev) {
          var rect = switchWrap.getBoundingClientRect();
          if (rect.width) setChoice(ev.clientX < rect.left + rect.width / 2 ? 0 : 1);
        });
        switchWrap.addEventListener('keydown', function (ev) {
          if (ev.key === 'ArrowLeft') { ev.preventDefault(); setChoice(0); noBtn.focus(); }
          if (ev.key === 'ArrowRight') { ev.preventDefault(); setChoice(1); yesBtn.focus(); }
        });
        if (choice !== null) setChoice(choice);

        var status = el('p', 'allison-status is-error', '');
        status.setAttribute('role', 'status');
        box.appendChild(status);
        var submitButton = button(existingGuest ? 'ACTUALIZAR MI RESPUESTA' : 'GUARDAR MI RESPUESTA', 'allison-btn allison-btn-primary', submit);
        box.appendChild(submitButton);

        var submissionId = randomId(24);
        function submit() {
          var nombre = field.input.value.replace(/\s+/g, ' ').trim();
          if (!nombre) { field.input.focus(); field.input.setAttribute('aria-invalid', 'true'); status.textContent = 'Escribe tu nombre completo.'; return; }
          field.input.removeAttribute('aria-invalid');
          if (choice !== 0 && choice !== 1) { status.textContent = 'Selecciona si SÍ asistirás o NO podrás asistir.'; return; }
          if (!BACKEND) { status.textContent = 'La respuesta no se puede guardar porque el servidor todavía no está conectado.'; return; }
          submitButton.disabled = true; submitButton.textContent = 'GUARDANDO…'; status.textContent = '';
          var payload = { nombre: nombre, personas: choice, submissionId: submissionId, enlace: generalPublicUrl() };
          if (existingGuest && existingGuest.id) payload.id = existingGuest.id;
          api('confirmGeneral', payload).then(function (res) {
            // Cada modificación recibe una nueva clave de envío; un reintento de red conserva la misma.
            submissionId = randomId(24);
            renderSuccess(res.guest);
          }, function (err) {
            submitButton.disabled = false;
            submitButton.textContent = existingGuest ? 'ACTUALIZAR MI RESPUESTA' : 'GUARDAR MI RESPUESTA';
            status.textContent = err.message + ' Tu respuesta no se modificó.';
          });
        }
      }

      if (generalRecordId) {
        box.appendChild(el('p', 'allison-help allison-center', 'Cargando tu respuesta guardada…'));
        api('generalGuest', { id: generalRecordId }, true).then(function (res) {
          renderGeneralForm(res.guest);
        }, function (err) {
          box.replaceChildren(el('h2', '', 'CONFIRMA TU ASISTENCIA'));
          box.appendChild(el('p', 'allison-status is-error', err.message));
          box.appendChild(button('USAR EL PASE GENERAL', 'allison-btn', function () {
            var u = new URL(generalPublicUrl()); location.href = u.href;
          }));
        });
      } else {
        renderGeneralForm(null);
      }
    }

    // Confirmación de asistencia por WhatsApp (invitación individual o anterior sin backend).
    function openRsvp() {
      if (generalPass) { openGeneralRsvp(); return; }
      if (serverGuest) { openServerRsvp(); return; }
      var box = el('div', 'allison-form'); box.appendChild(el('h2', '', 'CONFIRMA TU ASISTENCIA'));
      var f = makeField('Nombre del invitado', 'Escribe tu nombre'); if (guestName) f.input.value = guestName;
      box.appendChild(f.wrap);
      box.appendChild(button('CONFIRMAR POR WHATSAPP', 'allison-btn allison-btn-primary', function () {
        var name = f.input.value.trim(); if (!name) { f.input.focus(); f.input.setAttribute('aria-invalid', 'true'); return; }
        var msg = 'Hola, soy ' + name + '. Confirmo mi asistencia a los XV años de Allison Abril.';
        window.open(waLink(msg), '_blank', 'noopener,noreferrer');
      }));
      showModal(box);
    }
    var waImage = $('#iv-image_7pkrpvda9');
    if (!waImage) waImage = $('#iv-image_7pkrpvda9, [data-name="boton_confirmar_whatsapp_transparente"]');
    if (waImage) { waImage.style.cursor = 'pointer'; waImage.setAttribute('role', 'button'); waImage.setAttribute('tabindex', '0'); waImage.addEventListener('click', openRsvp); waImage.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();openRsvp();} }); }

    // Panel administrativo protegido por contraseña y generador de URL individual.
    // Acceso discreto: la flor se ve como un adorno más; solo la administración sabe que es un botón.
    var adminLauncher = el('button', 'allison-admin-launcher'); adminLauncher.type = 'button';
    adminLauncher.setAttribute('aria-label', 'Administración');
    var adminFlower = el('img'); adminFlower.src = 'assets/adorno_administracion.webp'; adminFlower.alt = ''; adminFlower.draggable = false;
    adminLauncher.appendChild(adminFlower);
    var adminFooter = el('div', 'allison-admin-footer'); adminFooter.appendChild(adminLauncher); invitation.appendChild(adminFooter); liftUp(adminFooter, endLift);
    var adminToken = null;
    function openLogin(notice) {
      var box = el('div', 'allison-form'); box.appendChild(el('h2', '', 'ACCESO ADMINISTRATIVO'));
      if (notice) box.appendChild(el('p', 'allison-note', notice));
      var f = makeField('Contraseña', 'Introduce la contraseña', 'password'); box.appendChild(f.wrap);
      var error = el('p', 'allison-error', ''); box.appendChild(error);
      var enter = button('ENTRAR', 'allison-btn allison-btn-primary', function () {
        var pw = f.input.value;
        if (!BACKEND) {
          if (pw !== PASSWORD) { error.textContent = 'Contraseña incorrecta.'; f.input.focus(); return; }
          openAdmin(); return;
        }
        // Con backend, la contraseña la valida el servidor y entrega un token de sesión temporal.
        enter.disabled = true; enter.textContent = 'VERIFICANDO…'; error.textContent = '';
        api('login', { password: pw }).then(function (res) { adminToken = res.token; openAdmin(); }, function (err) {
          enter.disabled = false; enter.textContent = 'ENTRAR'; error.textContent = err.message; f.input.focus();
        });
      });
      f.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); enter.click(); } });
      box.appendChild(enter);
      showModal(box);
    }
    adminLauncher.addEventListener('click', function () {
      if (BACKEND && adminToken) openAdmin(); else openLogin();
    });
    // Panel administrativo: generador, invitados registrados y confirmaciones (datos reales de Google Sheets).
    var adminTab = 'gen', editing = null;
    function linkBase() {
      var u = new URL(String(CFG.PUBLIC_URL || '').trim() || location.href, location.href); u.search = ''; u.hash = ''; return u;
    }
    function fmtDate(iso) { if (!iso) return '—'; var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }); }
    function statusPill(estado) { var p = el('span', 'allison-pill', estado || 'Pendiente'); p.setAttribute('data-estado', estado === 'Confirmado' ? 'ok' : estado === 'No asistirá' ? 'no' : 'pending'); return p; }
    function adminError(target, err, retry) {
      if (err.code === 'UNAUTHORIZED') { adminToken = null; openLogin('Tu sesión venció. Vuelve a iniciar sesión.'); return; }
      target.replaceChildren(el('p', 'allison-status is-error', err.message));
      if (retry) target.appendChild(button('REINTENTAR', 'allison-btn', retry));
    }
    function openAdmin(tab) {
      if (tab) adminTab = tab;
      var box = el('div', 'allison-form allison-admin'); box.appendChild(el('h2', '', 'PANEL DE ADMINISTRACIÓN'));
      if (!BACKEND) box.appendChild(el('p', 'allison-note', 'Servidor pendiente de conexión: el generador funciona, pero los invitados y confirmaciones no se guardan hasta configurar la URL de Apps Script (ver README-INSTALACION.txt).'));
      var tabs = el('div', 'allison-tabs'); tabs.setAttribute('role', 'tablist');
      var panel = el('div', 'allison-tab-panel');
      [['gen', 'GENERADOR'], ['list', 'INVITADOS'], ['conf', 'CONFIRMACIONES']].forEach(function (t) {
        var b = button(t[1], 'allison-tab', function () { adminTab = t[0]; draw(); });
        b.setAttribute('role', 'tab'); b.dataset.tab = t[0]; tabs.appendChild(b);
      });
      function draw() {
        Array.prototype.forEach.call(tabs.children, function (b) { var on = b.dataset.tab === adminTab; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.classList.toggle('is-active', on); });
        panel.replaceChildren(adminTab === 'gen' ? generatorView() : adminTab === 'list' ? guestsView() : confirmationsView());
      }
      box.appendChild(tabs); box.appendChild(panel); showModal(box); modal.classList.add('allison-modal-wide'); draw();
    }

    function generatorView() {
      var wrap = el('div', 'allison-form');
      wrap.appendChild(el('h3', 'allison-subtitle', editing ? 'EDITAR INVITADO' : 'GENERADOR DE INVITACIONES'));

      // Un único enlace general se puede compartir con muchas personas; cada respuesta genera un registro independiente.
      if (!editing) {
        var generalBox = el('div', 'allison-general-pass');
        generalBox.appendChild(el('h3', 'allison-subtitle', 'PASE GENERAL · 1 PERSONA'));
        generalBox.appendChild(el('p', 'allison-help', 'Comparte el mismo enlace. Cada persona escribirá su nombre y su confirmación se guardará como un registro separado.'));
        var generalResult = el('div', 'allison-link-result');
        generalBox.appendChild(button('GENERAR ENLACE DE PASE GENERAL', 'allison-btn allison-btn-primary', function () {
          var url = new URL(linkBase().href); url.searchParams.set('general', '1');
          generalResult.replaceChildren();
          var field = el('input', 'allison-generated-url'); field.readOnly = true; field.value = url.href; generalResult.appendChild(field);
          var note = el('p', 'allison-copy-status', ''); note.setAttribute('role', 'status');
          generalResult.appendChild(button('COPIAR PASE GENERAL', 'allison-btn', function () { copyWithFeedback(field.value, note, field); }));
          generalResult.appendChild(note);
          generalResult.appendChild(el('p', 'allison-help', 'No guarda una persona aquí: cada invitado se registra cuando envía su propia respuesta.'));
        }));
        generalBox.appendChild(generalResult);
        wrap.appendChild(generalBox);
      }

      var name = makeField('Nombre del invitado', 'Nombre y apellidos'); wrap.appendChild(name.wrap);
      var qty = makeField('Cantidad de pases', 'Ej. 2', 'number'); qty.input.min = '1'; qty.input.max = '20'; qty.input.value = '2'; wrap.appendChild(qty.wrap);
      if (editing) {
        name.input.value = editing.nombre; qty.input.value = String(editing.pases);
        if (editing.tipo === 'Pase general') { qty.input.value = '1'; qty.input.disabled = true; }
      }
      var result = el('div', 'allison-link-result');
      var current = null; // { id, nombre, pases, enlace }
      function invalidate() { if (current) { current = null; result.replaceChildren(el('p', 'allison-help', 'Los datos cambiaron: vuelve a pulsar GENERAR ENLACE.')); } }
      name.input.addEventListener('input', invalidate); qty.input.addEventListener('input', invalidate);
      function generate() {
        var n = name.input.value.replace(/\s+/g, ' ').trim(), q = parseInt(qty.input.value, 10);
        if (!n) { name.input.focus(); name.input.setAttribute('aria-invalid', 'true'); return; }
        if (!(q >= 1 && q <= 20)) { qty.input.focus(); qty.input.setAttribute('aria-invalid', 'true'); return; }
        name.input.removeAttribute('aria-invalid'); qty.input.removeAttribute('aria-invalid');
        var url = linkBase();
        if (BACKEND) {
          if (editing && editing.tipo === 'Pase general') {
            url.searchParams.set('general', '1');
            current = { id: editing.id, nombre: n, pases: 1, enlace: url.href, tipo: 'Pase general' };
          } else {
            var id = editing ? editing.id : (current && current.id) || randomId(16);
            url.searchParams.set('id', id); current = { id: id, nombre: n, pases: q, enlace: url.href, tipo: 'Personalizada' };
          }
        } else {
          url.searchParams.set('invitado', n); url.searchParams.set('pases', String(q)); current = { nombre: n, pases: q, enlace: url.href };
        }
        result.replaceChildren();
        var linkInput = el('input', 'allison-generated-url'); linkInput.readOnly = true; linkInput.value = current.enlace; result.appendChild(linkInput);
        var copyStatus = el('p', 'allison-copy-status', ''); copyStatus.setAttribute('role', 'status');
        result.appendChild(button('COPIAR ENLACE', 'allison-btn', function () { copyWithFeedback(current.enlace, copyStatus, linkInput); }));
        result.appendChild(copyStatus);
        if (BACKEND) {
          var saveStatus = el('div', 'allison-status'); saveStatus.setAttribute('role', 'status');
          var save = button(editing ? 'GUARDAR CAMBIOS' : 'GUARDAR INVITADO', 'allison-btn allison-btn-primary', function () { doSave(false); });
          var doSave = function (force) {
            var data = current; if (!data) return;
            save.disabled = true; save.textContent = 'GUARDANDO…'; saveStatus.className = 'allison-status'; saveStatus.replaceChildren();
            api('saveGuest', { token: adminToken, id: data.id, nombre: data.nombre, pases: data.pases, enlace: data.enlace, force: !!force }).then(function (res) {
              save.disabled = false; save.textContent = 'GUARDAR CAMBIOS';
              editing = res.guest;
              saveStatus.className = 'allison-status is-ok';
              saveStatus.replaceChildren(el('span', 'allison-block', res.created ? 'Invitado guardado en Google Sheets.' : 'Invitado actualizado en Google Sheets.'));
              saveStatus.appendChild(button('REGISTRAR OTRO INVITADO', 'allison-btn allison-btn-sm allison-next', function () { editing = null; openAdmin('gen'); }));
            }, function (err) {
              save.disabled = false; save.textContent = editing ? 'GUARDAR CAMBIOS' : 'GUARDAR INVITADO';
              if (err.code === 'UNAUTHORIZED') { adminError(saveStatus, err); return; }
              saveStatus.className = 'allison-status is-error'; saveStatus.replaceChildren(el('span', '', err.message + ' No se guardó.'));
              if (err.code === 'DUPLICATE_NAME' && err.data && err.data.existing) {
                var ex = err.data.existing;
                saveStatus.appendChild(el('span', 'allison-block', 'Registro existente: ' + ex.nombre + ' · ' + ex.pases + ' pase(s) · ' + ex.estado + '.'));
                var acts = el('div', 'allison-row-actions');
                acts.appendChild(button('EDITAR EL EXISTENTE', 'allison-btn allison-btn-sm', function () { editing = ex; openAdmin('gen'); }));
                acts.appendChild(button('GUARDAR COMO NUEVO', 'allison-btn allison-btn-sm', function () { doSave(true); }));
                saveStatus.appendChild(acts);
              }
            });
          };
          result.appendChild(save); result.appendChild(saveStatus);
          if (editing) {
            result.appendChild(button('ELIMINAR INVITADO', 'allison-btn allison-btn-danger', function () {
              if (!window.confirm('¿Eliminar definitivamente el registro de ' + editing.nombre + ' y su confirmación?')) return;
              api('deleteGuest', { token: adminToken, id: editing.id }).then(function () {
                editing = null; openAdmin('list');
              }, function (err) { adminError(saveStatus, err); });
            }));
          } else {
            result.appendChild(el('p', 'allison-help', 'El enlace funcionará cuando el invitado quede guardado.'));
          }
        } else {
          result.appendChild(el('p', 'allison-help', 'Sin servidor conectado: el enlace lleva el nombre y los pases en la dirección y no se registra.'));
        }
        if (/^file:/i.test(current.enlace)) result.appendChild(el('p', 'allison-help', 'Aviso: este enlace apunta a un archivo de tu equipo. Configura PUBLIC_URL o abre el panel desde la invitación publicada para compartirlo.'));
      }
      wrap.appendChild(button('GENERAR ENLACE', 'allison-btn allison-btn-primary', generate));
      if (editing) wrap.appendChild(button('NUEVO INVITADO', 'allison-btn', function () { editing = null; openAdmin('gen'); }));
      wrap.appendChild(result);
      if (editing) generate();
      return wrap;
    }

    function guestsView() {
      var wrap = el('div', 'allison-form');
      var head = el('div', 'allison-section-head'); head.appendChild(el('h3', 'allison-subtitle', 'INVITADOS REGISTRADOS'));
      var area = el('div', 'allison-table-area');
      function load() {
        if (!BACKEND) { area.replaceChildren(el('p', 'allison-note', 'Disponible cuando el servidor esté conectado.')); return; }
        area.replaceChildren(el('p', 'allison-help allison-center', 'Cargando invitados desde Google Sheets…'));
        api('listGuests', { token: adminToken }).then(function (res) {
          var list = res.guests || [];
          if (!list.length) { area.replaceChildren(el('p', 'allison-help allison-center', 'Todavía no hay invitados registrados.')); return; }
          var table = el('table', 'allison-table'); var thead = el('thead'); var tr = el('tr');
          ['Invitado', 'Tipo', 'Pases', 'Estado', 'Acciones'].forEach(function (h) { tr.appendChild(el('th', '', h)); }); thead.appendChild(tr); table.appendChild(thead);
          var tbody = el('tbody');
          list.forEach(function (g) {
            var row = el('tr'); row.appendChild(el('td', 'allison-td-name', g.nombre)); row.appendChild(el('td', '', g.tipo || 'Personalizada')); row.appendChild(el('td', 'allison-num', String(g.pases)));
            var st = el('td'); st.appendChild(statusPill(g.estado)); row.appendChild(st);
            var act = el('td'); var acts = el('div', 'allison-row-actions');
            var detail = el('tr', 'allison-detail'); detail.hidden = true; var dcell = el('td'); dcell.colSpan = 5; detail.appendChild(dcell);
            var note = el('p', 'allison-copy-status', '');
            acts.appendChild(button('Copiar', 'allison-btn allison-btn-sm', function () { copyWithFeedback(g.enlace, note); detail.hidden = false; fill(); }));
            acts.appendChild(button('Ver', 'allison-btn allison-btn-sm', function () { detail.hidden = !detail.hidden; fill(); }));
            acts.appendChild(button('Editar', 'allison-btn allison-btn-sm', function () { editing = g; openAdmin('gen'); }));
            acts.appendChild(button('Eliminar', 'allison-btn allison-btn-sm allison-btn-danger', function () {
              if (!window.confirm('¿Eliminar definitivamente a ' + g.nombre + ' y su registro de confirmación?')) return;
              api('deleteGuest', { token: adminToken, id: g.id }).then(load, function (err) { adminError(area, err, load); });
            }));
            act.appendChild(acts); row.appendChild(act);
            function fill() {
              if (dcell.dataset.filled) return; dcell.dataset.filled = '1';
              var dl = el('dl', 'allison-dl');
              [['Personas confirmadas', String(g.personas)], ['Creado', fmtDate(g.creado)], ['Actualizado', fmtDate(g.actualizado)], ['ID', g.id], ['Enlace', g.enlace]].forEach(function (p) {
                dl.appendChild(el('dt', '', p[0])); dl.appendChild(el('dd', '', p[1]));
              });
              dcell.appendChild(dl); dcell.appendChild(note);
            }
            tbody.appendChild(row); tbody.appendChild(detail);
          });
          table.appendChild(tbody); area.replaceChildren(table);
        }, function (err) { adminError(area, err, load); });
      }
      head.appendChild(button('ACTUALIZAR', 'allison-btn allison-btn-sm', load));
      wrap.appendChild(head); wrap.appendChild(area); load();
      return wrap;
    }

    function confirmationsView() {
      var wrap = el('div', 'allison-form');
      var head = el('div', 'allison-section-head'); head.appendChild(el('h3', 'allison-subtitle', 'CONFIRMACIONES DE ASISTENCIA'));
      var area = el('div', 'allison-table-area');
      function load() {
        if (!BACKEND) { area.replaceChildren(el('p', 'allison-note', 'Disponible cuando el servidor esté conectado.')); return; }
        area.replaceChildren(el('p', 'allison-help allison-center', 'Cargando confirmaciones desde Google Sheets…'));
        api('listConfirmations', { token: adminToken }).then(function (res) {
          var s = res.stats || {}, frag = document.createDocumentFragment();
          var stats = el('div', 'allison-stats');
          [['Invitados registrados', s.invitados], ['Confirmadas', s.confirmados], ['Pendientes', s.pendientes], ['No asistirán', s.noAsistiran],
           ['Pases asignados', s.pasesAsignados], ['Personas confirmadas', s.personasConfirmadas]].forEach(function (k) {
            var c = el('div', 'allison-stat'); c.appendChild(el('strong', '', String(k[1] == null ? 0 : k[1]))); c.appendChild(el('span', '', k[0])); stats.appendChild(c);
          });
          frag.appendChild(stats);
          var list = res.confirmations || [];
          if (!list.length) frag.appendChild(el('p', 'allison-help allison-center', 'Todavía no hay invitados registrados.'));
          else {
            var table = el('table', 'allison-table'); var thead = el('thead'); var tr = el('tr');
            ['Invitado', 'Tipo', 'Pases asignados', 'Estado', 'Personas confirmadas'].forEach(function (h) { tr.appendChild(el('th', '', h)); }); thead.appendChild(tr); table.appendChild(thead);
            var tbody = el('tbody');
            list.slice().sort(function (a, b) { var o = { 'Confirmado': 0, 'No asistirá': 1 }; return (o[a.estado] == null ? 2 : o[a.estado]) - (o[b.estado] == null ? 2 : o[b.estado]); })
              .forEach(function (c) {
                var row = el('tr'); row.appendChild(el('td', 'allison-td-name', c.nombre)); row.appendChild(el('td', '', c.tipo || 'Personalizada')); row.appendChild(el('td', 'allison-num', String(c.pases)));
                var st = el('td'); st.appendChild(statusPill(c.estado)); if (c.fechaConfirmacion) st.appendChild(el('small', 'allison-block', fmtDate(c.actualizado || c.fechaConfirmacion))); row.appendChild(st);
                row.appendChild(el('td', 'allison-num', String(c.personas))); tbody.appendChild(row);
              });
            table.appendChild(tbody); frag.appendChild(table);
          }
          area.replaceChildren(frag);
        }, function (err) { adminError(area, err, load); });
      }
      head.appendChild(button('ACTUALIZAR', 'allison-btn allison-btn-sm', load));
      wrap.appendChild(head); wrap.appendChild(area); load();
      return wrap;
    }

    function copyWithFeedback(text, statusEl, inputEl) {
      copyText(text).then(function () {
        statusEl.className = 'allison-copy-status is-ok'; statusEl.textContent = '¡Enlace copiado correctamente!';
      }, function () {
        if (inputEl) { inputEl.focus(); inputEl.setSelectionRange(0, inputEl.value.length); }
        statusEl.className = 'allison-copy-status is-error'; statusEl.textContent = 'No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente.';
      });
    }

    // Copia texto al portapapeles: API moderna en contextos seguros y, si falla o no existe, un campo temporal con execCommand.
    function copyText(text) {
      function legacy() {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
        (overlay.hidden ? document.body : modal).appendChild(ta);
        ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove(); return ok;
      }
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        return navigator.clipboard.writeText(text).catch(function () { if (legacy()) return; throw new Error('copy'); });
      }
      return legacy() ? Promise.resolve() : Promise.reject(new Error('copy'));
    }

    // Botón de música fijo en la esquina superior de la columna (se mueve el mismo elemento; no se duplica el reproductor).
    var musicEl = invitation.querySelector('.iv-obj.iv-music');
    if (musicEl) {
      var musicDock = el('div', 'allison-music-fixed');
      musicDock.appendChild(musicEl);
      var musicSvg = musicEl.querySelector(':scope > svg'); if (musicSvg) { musicSvg.setAttribute('width', '100%'); musicSvg.setAttribute('height', '100%'); }
      ($('#iv-invitation') || document.body).appendChild(musicDock);
    }

    // Aparición suave al desplazarse (una vez por elemento). Usa las propiedades translate/scale para no
    // interferir con las rotaciones ni los efectos originales de cada objeto.
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var envelopeIds = ['iv-image_bnj5bghs6', 'iv-image_yy01rvhs6'];
    envelopeIds.forEach(function (id) { var n = document.getElementById(id); if (n) n.classList.add('allison-envelope'); });
    // Botón de regreso al sobre: reinicia la página en su URL pública sin datos personalizados.
    var back = button('VOLVER AL SOBRE', 'allison-back-button', function () {
      var u = new URL(location.href); u.search = ''; u.hash = ''; location.assign(u.href);
    });
    invitation.appendChild(back); liftUp(back, endLift);

    // El pase personalizado no se muestra en la invitación general.
    if (!personalized) passCard.hidden = true;
    if (personalized) {
      document.title = 'Invitación de ' + guestName + ' · Allison Abril';
      // Nombre del invitado debajo del pase, centrado y con la tipografía de la invitación.
      var passInfo = el('div', 'allison-guest-greeting');
      passInfo.appendChild(el('span', 'allison-guest-name', guestName));
      passInfo.style.top = (passIntroHeight + 880) + 'px'; invitation.appendChild(passInfo);
      if (serverGuest) {
        var guestNameEl = passInfo.firstChild; guestNameEl.textContent = '…';
        loadGuest = function () {
          guestLoad = api('guest', { id: guestId }, true).then(function (res) {
            guestData = res.guest;
            guestNameEl.textContent = guestData.nombre; passText.textContent = String(guestData.pases);
            document.title = 'Invitación de ' + guestData.nombre + ' · Allison Abril';
          });
          return guestLoad;
        };
        loadGuest().catch(function (err) {
          guestNameEl.textContent = (err.code === 'NOT_FOUND' || err.code === 'INVALID_ID') ? 'Invitación no encontrada' : 'No se pudo cargar tu invitación';
          passText.textContent = '–';
        });
      }
    }

    // Aparición suave al desplazarse, en ambas direcciones: el elemento aparece al entrar en pantalla,
    // se reinicia al salir por completo y vuelve a animarse al regresar (al bajar o al subir).
    // Usa translate/scale/opacity para no interferir con rotaciones ni efectos originales.
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var scaleIds = envelopeIds.concat(['iv-image_tt8fuinho', 'iv-image_naqbaz8nq', 'iv-image_cu3zne32r', 'iv-image_g0xsq7mpq']);
      var targets = Array.prototype.slice.call(invitation.querySelectorAll(':scope > .iv-layer > .iv-obj, .allison-person-section, .allison-thanks-message, .allison-pass-section, .allison-guest-greeting'))
        .filter(function (n) { return !n.hidden && !n.classList.contains('iv-music'); });
      targets.forEach(function (n) { n.classList.add('allison-reveal'); if (scaleIds.indexOf(n.id) >= 0) n.classList.add('allison-reveal-scale'); });
      var revealObserver = new IntersectionObserver(function (entries) {
        var entering = [];
        entries.forEach(function (e) {
          var n = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.12) { if (!n.classList.contains('allison-in')) entering.push(e); }
          else if (!e.isIntersecting) {
            // Salió por completo: se reinicia y recuerda por dónde salió para volver a entrar desde ese lado.
            n.classList.remove('allison-in'); n.style.transitionDelay = '';
            n.setAttribute('data-from', e.boundingClientRect.top < (e.rootBounds ? e.rootBounds.top : 0) ? 'top' : 'bottom');
          }
        });
        entering.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
        entering.forEach(function (e, i) { e.target.style.transitionDelay = (Math.min(i, 4) * 100) + 'ms'; e.target.classList.add('allison-in'); });
      }, { threshold: [0, 0.12] });
      var startReveal = function () { targets.forEach(function (n) { revealObserver.observe(n); }); };
      if (window.WedditStudio && window.WedditStudio.isOpen()) startReveal();
      else document.addEventListener('wedditstudio:open', startReveal, { once: true });
    }
  }
  if (document.body.classList.contains('iv-ready') && window.WedditStudio) init();
  else document.addEventListener('wedditstudio:ready', init, { once: true });
})();
