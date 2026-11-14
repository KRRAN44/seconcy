// ======================================================
// $480 - Arrancar
// Ejecuta $202 y $404 y anota en actividad.json que quedó activo.
// Si el bot se detiene y lo vuelves a ejecutar, seconcy.js llama a
// reanudar() cuando conecta y $480 se activa solo (sin mandar el comando).
// Se apaga con $ST480 (plugg/ST-Arrancar.js).
// ======================================================
const { leerActividad, actualizarActividad } = require('../actividad')

// Para que reanudar() corra una sola vez por proceso: seconcy.js vuelve a
// llamar a startBot en cada reconexión, y $404 sigue vivo entre reconexiones.
let yaReanudado = false

module.exports = {
  name: '480',
  async execute(ctx) {
    const { commands, message } = ctx
    // En una reanudación automática no hay mensaje, por eso el ?.
    const quien = message?.key?.participant || message?.key?.remoteJid || 'reinicio automático'
    console.log(`[480] 📥 $480 recibido de ${quien}`)

    for (const nombre of ['202', '404']) {
      const cmd = commands.get(nombre)
      if (!cmd) {
        console.log(`[480] ⚠️ No encontré el comando $${nombre}`)
        continue
      }
      console.log(`[480] ▶️ Ejecutando $${nombre}...`)
      try {
        await cmd.execute(ctx)
        console.log(`[480] ✅ $${nombre} ejecutado`)
      } catch (error) {
        console.log(`[480] ❌ Error en $${nombre}: ${error.message}`)
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
      console.log('[480] 💾 actividad.json guardado (activo: true)')
    } catch (error) {
      console.log(`[480] ❌ No se pudo guardar actividad.json: ${error.message}`)
    }
  },

  // La llama seconcy.js cuando el bot se conecta a WhatsApp
  async reanudar({ sock, commands }) {
    if (yaReanudado) return
    const actividad = leerActividad()
    if (!actividad.activo || !actividad.jid) {
      console.log('[480] 💤 actividad.json no tiene nada activo; no hay que reanudar.')
      return
    }
    yaReanudado = true
    console.log(`[480] 🔁 actividad.json dice activo: reanudando $480 en ${actividad.jid}`)
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
