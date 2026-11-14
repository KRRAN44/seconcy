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
  name: 'aggbot',
  async execute({ sock, message, jid }) {
    const texto = obtenerTexto(message)
    const match = texto.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/)

    // Solo acepta links de grupos de WhatsApp
    if (!match) {
      await sock.sendMessage(jid, { text: whatsapp('🌊', 'Envía un enlace de grupo con $aggbot') }, { quoted: message })
      return
    }

    const codigo = match[1]

    try {
      // Saca el nombre del grupo con el código del link
      const info = await sock.groupGetInviteInfo(codigo)
      consola('$aggbot', `grupo detectado: ${info.subject}`)

      // Entra al grupo
      await sock.groupAcceptInvite(codigo)
      consola('$aggbot', `ingresó a ${info.subject}`)

      await sock.sendMessage(jid, { text: whatsapp('🎫', `Entré al grupo ${info.subject}`) }, { quoted: message })
    } catch (error) {
      consola('$aggbot', error.message, false)
      await sock.sendMessage(jid, { text: whatsapp('🍒', `No pude entrar al grupo: ${error.message}`) }, { quoted: message })
    }
  }
}
