/**
 * Qori — avisos del banco desde Gmail
 * ------------------------------------
 * Corre en TU cuenta de Google. Lee solo los correos que un filtro tuyo marque
 * con la etiqueta "Qori", los manda a tu app y los marca como procesados.
 *
 * A propósito NO entiende de bancos: solo reenvía el correo tal cual. Todo el
 * análisis (qué banco es, cuánto, en qué moneda, si es un gasto o hay que
 * ignorarlo) vive en el servidor de Qori. Así, cuando un banco cambie su
 * plantilla, se arregla allá y este script no se toca nunca más.
 *
 * INSTALACIÓN: ver GMAIL-SETUP.md
 */

// Etiqueta que pone tu filtro de Gmail a los correos del banco.
var ETIQUETA = 'Qori';
// Etiqueta que pone este script a lo ya enviado, para no repetir.
var ETIQUETA_LISTO = 'QoriListo';
// Cuántos correos como máximo por corrida (para no pasarse del tiempo límite).
var MAX_POR_CORRIDA = 20;

var URL = 'https://gastos-app-hazel.vercel.app/api/ingest-correo';

/**
 * Lo que dispara el temporizador cada pocos minutos.
 */
function revisarCorreos() {
  var token = PropertiesService.getScriptProperties().getProperty('QORI_TOKEN');
  if (!token) {
    Logger.log('Falta el token. Corre guardarToken() una vez.');
    return;
  }

  var listo = etiqueta_(ETIQUETA_LISTO);
  // Solo lo etiquetado por el filtro y que este script todavía no mandó.
  var hilos = GmailApp.search(
    'label:' + ETIQUETA.toLowerCase() + ' -label:' + ETIQUETA_LISTO.toLowerCase(),
    0, MAX_POR_CORRIDA
  );

  for (var i = 0; i < hilos.length; i++) {
    var mensajes = hilos[i].getMessages();
    var todosBien = true;

    for (var j = 0; j < mensajes.length; j++) {
      if (!enviar_(mensajes[j], token)) todosBien = false;
    }

    // Solo se marca como listo si TODOS sus mensajes se enviaron. Si alguno
    // falló (sin internet, servidor caído), el hilo se reintenta la próxima vez.
    if (todosBien) hilos[i].addLabel(listo);
  }
}

/**
 * Manda un mensaje a Qori. → true si el servidor lo recibió.
 */
function enviar_(mensaje, token) {
  var cuerpo = {
    from: mensaje.getFrom(),
    subject: mensaje.getSubject(),
    body: mensaje.getPlainBody(),
    messageId: mensaje.getId()
  };

  try {
    var res = UrlFetchApp.fetch(URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(cuerpo),
      muteHttpExceptions: true
    });

    var codigo = res.getResponseCode();
    Logger.log(codigo + ' · ' + mensaje.getSubject() + ' → ' + res.getContentText());

    // 201 = se guardó. 200 = se entendió pero no era un gasto (pago de tarjeta,
    // ingreso, duplicado). Los dos son éxito: no hay nada que reintentar.
    return codigo === 200 || codigo === 201;
  } catch (e) {
    Logger.log('Error de red: ' + e);
    return false;
  }
}

function etiqueta_(nombre) {
  return GmailApp.getUserLabelByName(nombre) || GmailApp.createLabel(nombre);
}

// ── Cosas que corres UNA vez, a mano ──────────────────────────────────────

/**
 * Guarda tu token. Pega el token, corre esta función UNA vez, y después
 * BÓRRALO de acá: queda guardado aparte, no dentro del código.
 */
function guardarToken() {
  var TOKEN = 'PEGA_AQUI_TU_TOKEN';
  PropertiesService.getScriptProperties().setProperty('QORI_TOKEN', TOKEN);
  Logger.log('Token guardado. Ahora borra el token de esta función.');
}

/**
 * Prende el temporizador: revisa cada 5 minutos. Corre esto una sola vez.
 */
function activarTemporizador() {
  var viejos = ScriptApp.getProjectTriggers();
  for (var i = 0; i < viejos.length; i++) ScriptApp.deleteTrigger(viejos[i]);
  ScriptApp.newTrigger('revisarCorreos').timeBased().everyMinutes(5).create();
  Logger.log('Listo: revisa cada 5 minutos.');
}

/**
 * Prueba con el correo etiquetado más reciente, SIN marcarlo como listo.
 * Sirve para ver qué responde el servidor antes de dejarlo solo.
 */
function probar() {
  var token = PropertiesService.getScriptProperties().getProperty('QORI_TOKEN');
  if (!token) { Logger.log('Falta el token. Corre guardarToken() primero.'); return; }

  var hilos = GmailApp.search('label:' + ETIQUETA.toLowerCase(), 0, 1);
  if (hilos.length === 0) { Logger.log('No hay ningún correo con la etiqueta ' + ETIQUETA); return; }

  var m = hilos[0].getMessages()[0];
  Logger.log('De: ' + m.getFrom());
  Logger.log('Asunto: ' + m.getSubject());
  Logger.log('--- cuerpo ---');
  Logger.log(m.getPlainBody().slice(0, 1500));
  Logger.log('--- respuesta de Qori ---');
  enviar_(m, token);
}
