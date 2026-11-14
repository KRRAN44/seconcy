// ======================================================
// $480 - Arrancar
// Ejecuta $202 y $404 y anota en actividad.json que quedó activo.
// Si el bot se detiene y lo vuelves a ejecutar, seconcy.js llama a
// reanudar() cuando conecta y $480 se activa solo (sin mandar el comando).
// Se apaga con $ST480 (plugg/ST-Arrancar.js).
// ======================================================
const { leerActividad, actualizarActividad } = require('../actividad')
const { consola } = require('../decoracion')

// Para que reanudar() corra una sola vez por proceso: seconcy.js vuelve a
// llamar a startBot en cada reconexión, y $404 sigue vivo entre reconexiones.
let yaReanudado = false

module.exports = {
  name: '480',
  async execute(ctx) {
    const { commands, message } = ctx
    // En una reanudación automática no hay mensaje, por eso el ?.
    const quien = message?.key?.participant || message?.key?.remoteJid || 'reinicio automático'
    consola('$480', `recibido de ${quien}`)

    for (const nombre of ['202', '404']) {
      const cmd = commands.get(nombre)
      if (!cmd) {
        consola('$480', `no se encontró $${nombre}`, false)
        continue
      }
      consola('$480', `iniciando $${nombre}`)
      try {
        await cmd.execute(ctx)
        consola(`$${nombre}`, 'ejecutado')
      } catch (error) {
        consola(`$${nombre}`, error.message, false)
      }
    }

    // Anotar en actividad.json que $480 quedó activo y en qué chat
    try {
      actualizarActividad(a => ({
        ...a,
        activo: true,
        jid: ctx.jid,
        activadoEn: new Date().toISOString()
      }))
      consola('$480', 'actividad.json guardado; activo')
    } catch (error) {
      consola('$480', `no se pudo guardar actividad.json: ${error.message}`, false)
    }
  },

  // La llama seconcy.js cuando el bot se conecta a WhatsApp
  async reanudar({ sock, commands }) {
    if (yaReanudado) return
    const actividad = leerActividad()
    if (!actividad.activo || !actividad.jid) {
      consola('$480', 'sin actividad pendiente')
      return
    }
    yaReanudado = true
    consola('$480', `reanuda en ${actividad.jid}`)
    await module.exports.execute({
      sock,
      commands,
      jid: actividad.jid,
      message: null,
      args: '',
      text: '',
      prefix: '$'
    })
  }
}
