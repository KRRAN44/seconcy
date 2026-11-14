const cmd202 = require('./Envio.js')
const { consola, whatsapp } = require('../decoracion')

module.exports = {
  name: 'st202',
  async execute({ sock, message, jid }) {
    const quien = message.key.participant || message.key.remoteJid
    consola('$ST202', `recibido de ${quien}`)
    if (cmd202.detener()) {
      consola('$ST202', 'envío detenido')
      await sock.sendMessage(jid, { text: whatsapp('🎫', 'Envío $202 detenido') }, { quoted: message })
    } else {
      consola('$ST202', 'el envío ya estaba detenido')
      await sock.sendMessage(jid, { text: whatsapp('🍒', '$202 no estaba activo') }, { quoted: message })
    }
  }
}
