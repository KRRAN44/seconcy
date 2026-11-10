const cmd202 = require('./202')

module.exports = {
  name: 'st202',
  async execute({ sock, message, jid }) {
    const quien = message.key.participant || message.key.remoteJid
    console.log(`[202] 📥 $ST202 recibido de ${quien}`)
    if (cmd202.detener()) {
      console.log('[202] 🔴 Desactivado.')
      await sock.sendMessage(jid, { text: '🛑 $202 desactivado' }, { quoted: message })
    } else {
      console.log('[202] ℹ️ No estaba activo.')
      await sock.sendMessage(jid, { text: 'No estaba activo, wey 🤷' }, { quoted: message })
    }
  }
}
