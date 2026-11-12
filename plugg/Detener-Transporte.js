// ======================================================
// $ST404 - detiene la cola de $404 (plugg/404.js)
// Se puede usar en grupos y en chats privados, igual que $404.
// ======================================================
const cola404 = require('./Transporte.js')

const reset = '\x1b[0m';
const amarillo = '\x1b[33m';

module.exports = {
  name: 'st404',
  async execute({ sock, jid }) {
    const detenido = cola404.detener()
    await sock.sendMessage(jid, {
      text: detenido ? `> … . . [ 🏆 ] . . …. *_DESACTIVADO: ~$404~_*` : '> $404 no estaba activo.'
    })
  }
}
