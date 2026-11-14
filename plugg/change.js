// ======================================================
// $change - cambia el mensaje de contenido/contenido.txt
//   $change TEXTO NUEVO        -> reemplaza TODO el contenido con ese texto
//   (respondiendo a un mensaje) $change  -> usa el texto del mensaje citado
// Envio.js ($202) lee el archivo en cada envío, así que el cambio
// se aplica de inmediato, sin reiniciar el bot.
// ======================================================
const fs = require('fs')
const path = require('path')

const CONTENIDO = path.join(__dirname, '..', 'contenido', 'contenido.txt')

// Quita envolturas (mensajes temporales, ver una vez, etc.)
function desenvolver(content) {
  while (content) {
    const interno =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.documentWithCaptionMessage?.message
    if (!interno) break
    content = interno
  }
  return content
}

function textoDe(content) {
  content = desenvolver(content)
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ''
  )
}

// Texto del mensaje al que respondiste (si respondiste a alguno)
function textoCitado(message) {
  const content = desenvolver(message.message)
  const contexto =
    content?.extendedTextMessage?.contextInfo ||
    content?.imageMessage?.contextInfo ||
    content?.videoMessage?.contextInfo
  return textoDe(contexto?.quotedMessage)
}

module.exports = {
  name: 'change',
  async execute({ sock, message, jid, args }) {
    const quien = message?.key?.participant || message?.key?.remoteJid
    console.log(`[change] 📥 $change recibido de ${quien}`)

    // Prioridad: lo que escribes después de $change; si no hay, el mensaje citado
    const nuevo = (args || '').trim() || textoCitado(message).trim()

    if (!nuevo) {
      console.log('[change] ⚠️ No había texto ni mensaje citado.')
      await sock.sendMessage(jid, {
        text: '> Escribe el texto: *$change tu mensaje*\n> o responde a un mensaje con *$change*'
      }, { quoted: message })
      return
    }

    try {
      fs.writeFileSync(CONTENIDO, nuevo, 'utf8')
    } catch (error) {
      console.log(`[change] ❌ No pude escribir contenido.txt: ${error.message}`)
      await sock.sendMessage(jid, { text: '❌ No pude guardar el contenido.' }, { quoted: message })
      return
    }

    console.log(`[change] ✅ contenido.txt reemplazado (${nuevo.length} caracteres)`)
    await sock.sendMessage(jid, {
      text: `> _*[ 🐲 ] . . CONTENIDO CAMBIADO (${nuevo.length} caracteres)*_`
    }, { quoted: message })
  }
}
