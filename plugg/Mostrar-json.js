const fs = require('fs')
const path = require('path')

const RUTA_JSON = path.join(__dirname, '..', 'JSON', 'pre-miem.json')
const MAX_CARACTERES = 3500 // WhatsApp aguanta mucho, pero así no se hace pesado

// colores para consola
const reset = '\x1b[0m';

const rojo = '\x1b[31m';
const verde = '\x1b[32m';
const amarillo = '\x1b[33m';
const azul = '\x1b[34m';
const cyan = '\x1b[36m';
const magenta = '\x1b[35m';
const blanco = '\x1b[37m';
// ya no colores xdd
const log = (...args) => console.log(`${cyan}[ $cat  🍹 ]${reset}`, ...args)

module.exports = {
  name: 'cat',
  async execute({ sock, message, jid }) {
    const quien = message.key.participant || message.key.remoteJid
    log(`${verde}         [ 🐸 ] $cat recibido de ${quien} ${reset}`)

     // 1) Leer el archivo
    let data
    try {
      data = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'))
      log(`${blanco}         [ 🥥 ] Archivo json leído ${reset}`)
    } catch (error) {
      log(`${rojo}         [ 🍒 ] No pude leer archivo json: ${error.message} ${reset}`)
      await sock.sendMessage(jid, { 
text: `> _*[ 🪫 ] ~ No pude leer archivo json…*_`}, { quoted: message })
      return
    }

      // 2) Armar el texto: un bloque por grupo
    let total = 0
    const bloques = []
    for (const [grupo, lista] of Object.entries(data)) {
      if (!Array.isArray(lista) || lista.length === 0) continue
      total += lista.length
      const numeros = lista.map(n => `• ${String(n).replace('@s.whatsapp.net', '')}`)
      bloques.push(`[ 🕯️ ] 
*_~${grupo}~_*
${numeros.join('\n')}`)
    }

    if (total === 0) {
      log(`${rojo}         [ 🍒 ] Archivo json vacio…`)
      await sock.sendMessage(jid, { 
text: `> _*[ 🪫 ] ~ Archivo json vacio totalmente…*_` }, { quoted: message })
      return
    }

    // 3) Partir en mensajes si es muy largo
    const texto = `*_[ 🧊 ] ~ Archivo json…_* 
> _Cantidad total de números: *${total}*_ 

${bloques.join('\n\n')}`

    const partes = []
    for (let i = 0; i < texto.length; i += MAX_CARACTERES) {
      partes.push(texto.slice(i, i + MAX_CARACTERES))
    }

      // 4) Enviar
    for (let i = 0; i < partes.length; i++) {
      await sock.sendMessage(jid, { text: partes[i] }, i === 0 ? { quoted: message } : {})
      log(`${azul}         [ 🤹‍♀️ ] Parte ${i + 1}/${partes.length} enviada….${reset}`)
    }
    log(`${azul}         [ 🤹‍♀️ ] Hecho: ${total} números en json enviados a ${jid}….${reset}`)
  }
}
