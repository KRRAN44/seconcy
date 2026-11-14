// ======================================================
// $ST404 - detiene la cola de $404 (plugg/404.js)
// Se puede usar en grupos y en chats privados, igual que $404.
// ======================================================
const cola404 = require('./Transporte.js')
const { guardarActividad } = require('../actividad')

const reset = '\x1b[0m';
const amarillo = '\x1b[33m';

module.exports = {
  name: 'st404',
  async execute({ sock, jid }) {
    const detenido = cola404.detener()
    // Anotar que ya no debe reanudarse solo al reiniciar el bot
    try {
      guardarActividad({ activo: false, detenidoEn: new Date().toISOString() })
      console.log('[ST404] 💾 actividad.json guardado (activo: false)')
    } catch (error) {
      console.log(`[ST404] ❌ No se pudo guardar actividad.json: ${error.message}`)
    }
    await sock.sendMessage(jid, {
      text: detenido ? `> … . . [ 🏆 ] . . …. *_DESACTIVADO: ~$404~_*` : '> $404 no estaba activo.'
    })
  }
}
