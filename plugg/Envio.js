const fs = require('fs')
const path = require('path')

// ====== CAMBIA AQUÍ EL MENSAJE ======
const MENSAJE = 'Hola 👋'
// ====================================

const RUTA_JSON = path.join(__dirname, '..', 'JSON', 'miembros.json')
const REVISION_MS = 2000         // cada cuánto revisa el JSON
const PAUSA_ENTRE_ENVIOS_MS = 3000 // pausa entre mensaje y mensaje

let timer = null
let ocupado = false
const yaEnviados = new Set() // números a los que ya se les intentó enviar

const log = (...args) => console.log('[202]', ...args)
const dormir = ms => new Promise(r => setTimeout(r, ms))

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

async function revisar(sock) {
  if (ocupado) return
  ocupado = true
  try {
    let numeros
    try {
      numeros = leerNumeros()
    } catch (error) {
      log(`⚠️ No pude leer miembros.json: ${error.message}`)
      return
    }
    const nuevos = numeros.filter(n => !yaEnviados.has(n))
    for (const jid of nuevos) {
      if (!timer) break // si lo desactivaron a la mitad, paramos
      yaEnviados.add(jid)
      log(`🆕 Número detectado: ${jid}`)
      try {
        log(`📤 Enviando mensaje a ${jid}...`)
        await sock.sendMessage(jid, { text: MENSAJE })
        log(`✅ Mensaje enviado a ${jid}`)
      } catch (error) {
        log(`❌ Error enviando a ${jid}: ${error.message}`)
      }
      await dormir(PAUSA_ENTRE_ENVIOS_MS)
    }
  } finally {
    ocupado = false
  }
}

function detener() {
  if (!timer) return false
  clearInterval(timer)
  timer = null
  return true
}

module.exports = {
  name: '202',
  isActive: () => Boolean(timer),
  detener,
  async execute({ sock, message, jid }) {
    const quien = message.key.participant || message.key.remoteJid
    log(`📥 $202 recibido de ${quien}`)
    if (timer) {
      log('ℹ️ Ya estaba activo.')
      await sock.sendMessage(jid, { text: 'Ya está activo, wey 😎' }, { quoted: message })
      return
    }
    timer = setInterval(() => revisar(sock), REVISION_MS)
    log(`🟢 Activado. Revisando ${RUTA_JSON} cada ${REVISION_MS / 1000}s`)
    await sock.sendMessage(jid, { text: '✅ $202 activado' }, { quoted: message })
    revisar(sock) // revisa de una vez, sin esperar el primer intervalo
  }
}
