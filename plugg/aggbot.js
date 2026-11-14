const log = (...args) => console.log('[AGGBOT]', ...args)

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
      await sock.sendMessage(jid, { text: '⚠️ Mándame un link de grupo de WhatsApp: *$aggbot https://chat.whatsapp.com/xxxx*' }, { quoted: message })
      return
    }

    const codigo = match[1]

    try {
      // Saca el nombre del grupo con el código del link
      const info = await sock.groupGetInviteInfo(codigo)
      log(`🔎 Grupo detectado: ${info.subject} (${info.id})`)

      // Entra al grupo
      await sock.groupAcceptInvite(codigo)
      log(`✅ Entré a ${info.subject}`)

      await sock.sendMessage(jid, { text: `✅ Ya entré al grupo *${info.subject}* 🤖` }, { quoted: message })
    } catch (error) {
      log(`❌ Error: ${error.message}`)
      await sock.sendMessage(jid, { text: `❌ No pude entrar al grupo: ${error.message}` }, { quoted: message })
    }
  }
}
