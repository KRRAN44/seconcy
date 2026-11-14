// ======================================================
// $ST480 - detiene lo que arrancó $480 y lo anota en actividad.json
// para que al reiniciar el bot NO se reanude solo.
// ======================================================
const { actualizarActividad } = require('../actividad')

module.exports = {
  name: 'st480',
  async execute(ctx) {
    const { commands, message } = ctx
    const quien = message?.key?.participant || message?.key?.remoteJid || 'reinicio automático'
    console.log(`[480] 📥 $ST480 recibido de ${quien}`)

    for (const nombre of ['st202', 'st404']) {
      const cmd = commands.get(nombre)
      if (!cmd) {
        console.log(`[480] ⚠️ No encontré el comando $${nombre}`)
        continue
      }
      console.log(`[480] ⏹️ Ejecutando $${nombre}...`)
      try {
        await cmd.execute(ctx)
        console.log(`[480] ✅ $${nombre} ejecutado`)
      } catch (error) {
        console.log(`[480] ❌ Error en $${nombre}: ${error.message}`)
      }
    }

    // Anotar que ya no debe reanudarse solo
    try {
      actualizarActividad(a => ({ ...a, activo: false, detenidoEn: new Date().toISOString() }))
      console.log('[480] 💾 actividad.json guardado (activo: false)')
    } catch (error) {
      console.log(`[480] ❌ No se pudo guardar actividad.json: ${error.message}`)
    }
  }
}