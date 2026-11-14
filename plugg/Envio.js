// ======================================================
// $202 - Envio
// Manda el mensaje de contenido/contenido.txt a cada número de
// JSON/miembros.json. Su estado se guarda en actividad.json (sección
// "envio") para que si el bot se detiene o se reconecta, el envío
// siga activo y NO le vuelva a escribir a quien ya recibió el mensaje.
// ======================================================
const fs = require('fs')
const path = require('path')
const { leerActividad, actualizarActividad } = require('../actividad')
const { consola, whatsapp } = require('../decoracion')

// ====== CAMBIA AQUÍ EL MENSAJE ======
const CONTENIDO = path.join(__dirname, '..', 'contenido', 'contenido.txt') // archivo de texto con el mensaje a enviar
// Se lee en cada envío para que $change surta efecto sin reiniciar el bot
const leerMensaje = () => fs.readFileSync(CONTENIDO, 'utf8')
// ====================================

const RUTA_JSON = path.join(__dirname, '..', 'JSON', 'miembros.json')
const REVISION_MS = 2000         // cada cuánto revisa el JSON
const PAUSA_ENTRE_ENVIOS_MS = 3000 // pausa entre mensaje y mensaje

let timer = null
let ocupado = false
let sockActual = null // siempre el socket más reciente (cambia en cada reconexión)
let chatOrigen = null // chat (grupo o privado) donde se ejecutó $202

// Números a los que ya se les intentó enviar; se carga de actividad.json
// para que sobreviva a reinicios del bot
const yaEnviados = new Set(leerActividad().envio?.enviados || [])

const log = (detalle, correcto = true) => consola('$202', detalle, correcto)
const dormir = ms => new Promise(r => setTimeout(r, ms))

// Guarda un pedazo del estado en actividad.json (sin tocar lo demás)
function contarPendientes() {
  try {
    return leerNumeros().filter(numero => !yaEnviados.has(numero)).length
  } catch {
    return null
  }
}

function detallePendientes(cantidad) {
  return cantidad === null
    ? 'total de destinatarios no disponible'
    : `${cantidad} destinatarios, aprox. ${estimarDuracion(cantidad)}`
}

function estimarDuracion(cantidad) {
  const segundos = Math.ceil(cantidad * PAUSA_ENTRE_ENVIOS_MS / 1000)
  if (segundos < 60) return `${segundos} s`
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`
}

function guardarEstado(parche) {
  try {
    actualizarActividad(actividad => ({
      ...actividad,
      envio: { ...(actividad.envio || {}), ...parche }
    }))
  } catch (error) {
    log(`no se pudo guardar actividad.json: ${error.message}`, false)
  }
}

// ¿El error fue porque se cayó la conexión con WhatsApp?
function conexionCaida(error) {
  return error?.output?.statusCode === 428 || /connection closed|not connected/i.test(error?.message || '')
}

// Lee TODOS los números del JSON (de todos los grupos)
function leerNumeros() {
  const data = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'))
  const listas = Array.isArray(data) ? [data] : Object.values(data)
  const numeros = []
  for (const lista of listas) {
    if (!Array.isArray(lista)) continue
    for (const valor of lista) {
      if (typeof valor === 'string' && valor.endsWith('@s.whatsapp.net')) numeros.push(valor)
    }
  }
  return [...new Set(numeros)]
}

async function revisar() {
  if (ocupado) return
  ocupado = true
  try {
    let numeros
    try {
      numeros = leerNumeros()
    } catch (error) {
      log(`no se pudo leer miembros.json: ${error.message}`, false)
      return
    }
    const nuevos = numeros.filter(n => !yaEnviados.has(n))
    for (const jid of nuevos) {
      if (!timer) break // si lo desactivaron a la mitad, paramos
      const sock = sockActual
      if (!sock) break
      log(`destinatario detectado: ${jid}`)
      try {
        log(`enviando mensaje a ${jid}`)
        await sock.sendMessage(jid, { text: leerMensaje() })
        yaEnviados.add(jid)
        guardarEstado({ enviados: [...yaEnviados] })
        log(`mensaje enviado a ${jid}`)

        // Avisa en el chat donde se ejecutó el comando
        if (chatOrigen) {
          try {
            await sockActual.sendMessage(chatOrigen, { text: whatsapp('🐲', `Mensaje enviado; destino ${jid}`) })
          } catch (e) {
            log(`no se pudo avisar en el chat de origen: ${e.message}`, false)
          }
        }
      } catch (error) {
        if (conexionCaida(error)) {
          // No lo marcamos como enviado: se reintenta cuando reconecte
          log(`conexión caída al enviar a ${jid}; se reintentará al reconectar`, false)
          break
        }
        yaEnviados.add(jid)
        guardarEstado({ enviados: [...yaEnviados] })
        log(`error enviando a ${jid}: ${error.message}`, false)
      }
      await dormir(PAUSA_ENTRE_ENVIOS_MS)
    }
  } finally {
    ocupado = false
  }
}

function iniciar(sock, jid) {
  sockActual = sock
  if (jid) chatOrigen = jid
  if (timer) return false
  timer = setInterval(revisar, REVISION_MS)
  guardarEstado({ activo: true, jid: chatOrigen })
  revisar() // revisa de una vez, sin esperar el primer intervalo
  return true
}

function detener() {
  if (!timer) return false
  clearInterval(timer)
  timer = null
  chatOrigen = null
  guardarEstado({ activo: false, detenidoEn: new Date().toISOString() })
  return true
}

module.exports = {
  name: '202',
  isActive: () => Boolean(timer),
  detener,

  // La llama seconcy.js CADA VEZ que el bot se conecta (primera vez y reconexiones)
  async reanudar({ sock }) {
    sockActual = sock // aunque ya esté activo, cambia al socket nuevo
    if (timer) {
      log('reconectado; envío activo con el socket nuevo')
      revisar()
      return
    }
    const envio = leerActividad().envio
    if (!envio?.activo) {
      log('sin envío pendiente para reanudar')
      return
    }
    const pendientes = contarPendientes()
    log(`reanuda desde actividad.json; ${detallePendientes(pendientes)}`)
    iniciar(sock, envio.jid)
  },

  async execute({ sock, message, jid }) {
    // En una reanudación automática no hay mensaje, por eso el ?.
    const quien = message?.key?.participant || message?.key?.remoteJid || 'reinicio automático'
    log(`recibido de ${quien}`)
    const opciones = message ? { quoted: message } : undefined
    const avisar = texto => message ? sock.sendMessage(jid, { text: texto }, opciones) : null

    if (!iniciar(sock, jid)) {
      const pendientes = contarPendientes()
      log(`ya estaba activo; ${detallePendientes(pendientes)}`)
      await avisar(whatsapp('🍒', `$202 ya está activo; ${pendientes === null ? 'destinatarios no disponibles' : `${pendientes} pendientes`}`))
      return
    }
    guardarEstado({ activadoEn: new Date().toISOString() })
    const pendientes = contarPendientes()
    log(`activo; ${detallePendientes(pendientes)}`)
    await avisar(whatsapp('🛰️', `$202 activo; ${detallePendientes(pendientes)}`))
  }
}
