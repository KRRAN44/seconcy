module.exports = {
  name: '480',
  async execute(ctx) {
    const { commands, message } = ctx
    const quien = message.key.participant || message.key.remoteJid
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
  }
}
