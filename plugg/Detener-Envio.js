const cmd202 = require('./Envio.js')

const reset = '\x1b[0m';
const amarillo = '\x1b[33m'; 

module.exports = {
  name: 'st202',
  async execute({ sock, message, jid }) {
    const quien = message.key.participant || message.key.remoteJid
    console.log(`[202] 📥 $ST202 recibido de ${quien}`)
    if (cmd202.detener()) {
      console.log(`${amarillo} … . . [ 🏆 ] . . …. DESACTIVADO ${reset}`)
      await sock.sendMessage(jid, { text: `> … . . [ 🏆 ] . . …. *_DESACTIVADO: ~$202~_*` }, { quoted: message })
    } else {
      console.log('[202] ℹ️ No estaba activo.')
      await sock.sendMessage(jid, { text: '… . . [ 🏆 ] . . ….' }, { quoted: message })
    }
  }
}
