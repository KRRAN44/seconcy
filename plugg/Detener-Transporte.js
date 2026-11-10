// ======================================================
// $ST404 - detiene la cola de $404 (plugg/404.js)
// Lo puede usar cualquier integrante del grupo, igual que $404.
// ======================================================
const cola404 = require('./404')

module.exports = {
  name: 'st404',
  async execute({ sock, jid }) {
    if (!cola404.puedeUsarlo(jid)) {
      await sock.sendMessage(jid, {
        text: '🚫 $ST404 solo funciona en grupos.'
      })
      return
    }
    const detenido = cola404.detener()
    await sock.sendMessage(jid, {
      text: detenido ? '🛑 $404 detenido.' : 'ℹ️ $404 no estaba activo.'
    })
  }
}
