const cola404 = require('./Transporte.js')
const { guardarActividad } = require('../actividad')
const { consola, whatsapp } = require('../decoracion')

module.exports = {
  name: 'st404',
  async execute({ sock, jid }) {
    const detenido = cola404.detener()
    try {
      guardarActividad({ activo: false, detenidoEn: new Date().toISOString() })
      consola('$ST404', 'actividad guardada; detenido')
    } catch (error) {
      consola('$ST404', `no se pudo guardar actividad: ${error.message}`, false)
    }
    await sock.sendMessage(jid, {
      text: detenido ? whatsapp('🍺', 'Transporte $404 detenido') : whatsapp('🍒', '$404 no estaba activo')
    })
  }
}
