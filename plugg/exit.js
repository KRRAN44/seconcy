const fs = require('fs')

const log = (...args) => console.log('[EXIT]', ...args)

// Saca el texto del mensaje (normal, respuesta o pie de foto)
function obtenerTexto(message) {
  const m = message.message || {}
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  )
}

module.exports = {
  name: 'exit',
  async execute({ sock, message, jid }) {
    const texto = obtenerTexto(message)
    const match = texto.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/)

    // Sin link de grupo, no hace nada
    if (!match) {
      await sock.sendMessage(jid, { text: '⚠️ Mándame un link de grupo de WhatsApp: *$exit https://chat.whatsapp.com/xxxx*' }, { quoted: message })
      return
    }

    const codigo = match[1]

    try {
      // Con el código del link saca la info del grupo (incluye su ID)
      const info = await sock.groupGetInviteInfo(codigo)
      log(`🔎 Grupo detectado: ${info.subject} (${info.id})`)

      // Solo se sale del grupo
      await sock.groupLeave(info.id)
      log(`🚪 Salí de ${info.id}`)

      await sock.sendMessage(jid, { text: `🚪 Salí del grupo *${info.subject}* ✅` }, { quoted: message })
    } catch (error) {
      log(`❌ Error: ${error.message}`)
      await sock.sendMessage(jid, { text: `❌ No pude salir del grupo: ${error.message}` }, { quoted: message })
    }
  }
}
