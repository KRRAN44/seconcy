// ======================================================
// $ST404 - detiene la cola de $404 (plugg/404.js)
// Lo puede usar cualquier integrante del grupo, igual que $404.
// ======================================================
const cola404 = require('./Transporte.js')

const reset = '\x1b[0m';
const amarillo = '\x1b[33m';

module.exports = {
  name: 'st404',
  async execute({ sock, jid }) {
    if (!cola404.puedeUsarlo(jid)) {
      await sock.sendMessage(jid, {
        text: '> *$ST404 solo funciona en grupos.*'
      })
      return
    }
    const detenido = cola404.detener()
    await sock.sendMessage(jid, {
      text: detenido ? `> … . . [ 🏆 ] . . …. *_DESACTIVADO: ~$404~_*` : '> $404 no estaba activo.'
    })
  }
}
