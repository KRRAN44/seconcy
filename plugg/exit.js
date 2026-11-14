const fs = require('fs')

const { consola, whatsapp } = require('../decoracion')

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
      await sock.sendMessage(jid, { text: whatsapp('🌊', 'Envía un enlace de grupo con $exit') }, { quoted: message })
      return
    }

    const codigo = match[1]

    try {
      // Con el código del link saca la info del grupo (incluye su ID)
      const info = await sock.groupGetInviteInfo(codigo)
      consola('$exit', `grupo detectado: ${info.subject}`)

      // Solo se sale del grupo
      await sock.groupLeave(info.id)
      consola('$exit', `salió de ${info.subject}`)

      await sock.sendMessage(jid, { text: whatsapp('🍒', `Salí del grupo ${info.subject}`) }, { quoted: message })
    } catch (error) {
      consola('$exit', error.message, false)
      await sock.sendMessage(jid, { text: whatsapp('🍓', `No pude salir del grupo: ${error.message}`) }, { quoted: message })
    }
  }
}
