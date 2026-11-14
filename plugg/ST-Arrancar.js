// ======================================================
// $ST480 - detiene lo que arrancó $480 y lo anota en actividad.json
// para que al reiniciar el bot NO se reanude solo.
// ======================================================
const { actualizarActividad } = require('../actividad')
const { consola } = require('../decoracion')

module.exports = {
  name: 'st480',
  async execute(ctx) {
    const { commands, message } = ctx
    const quien = message?.key?.participant || message?.key?.remoteJid || 'reinicio automático'
    consola('$ST480', `recibido de ${quien}`)

    for (const nombre of ['st202', 'st404']) {
      const cmd = commands.get(nombre)
      if (!cmd) {
        consola('$ST480', `no se encontró $${nombre}`, false)
        continue
      }
      consola('$ST480', `iniciando $${nombre}`)
      try {
        await cmd.execute(ctx)
        consola(`$${nombre}`, 'ejecutado')
      } catch (error) {
        consola(`$${nombre}`, error.message, false)
      }
    }

    // Anotar que ya no debe reanudarse solo
    try {
      actualizarActividad(a => ({ ...a, activo: false, detenidoEn: new Date().toISOString() }))
      consola('$ST480', 'actividad.json guardado; detenido')
    } catch (error) {
      consola('$ST480', `no se pudo guardar actividad.json: ${error.message}`, false)
    }
  }
}