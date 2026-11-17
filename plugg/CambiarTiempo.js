const { cambiarIntervalo, intervaloActual } = require('./Transporte')
const { consola, whatsapp } = require('../decoracion')

function formatear(ms) {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${ms / 1000} s`
  return `${ms / 60000} min`
}

module.exports = {
  name: 'c.time',
  async execute({ sock, jid, args }) {
    // Sin número: solo muestra el tiempo actual
    if (!args || args.length === 0) {
      const ms = intervaloActual()
      await sock.sendMessage(jid, {
        text: whatsapp('⏱️', `Tiempo actual: ${ms} ms (${formatear(ms)})`)
      })
      return
    }

    const ms = Number(args[0])
    const resultado = cambiarIntervalo(ms)

    if (!resultado.ok) {
      consola('$c.time', resultado.motivo, false)
      await sock.sendMessage(jid, {
        text: whatsapp('❌', `Mal: ${resultado.motivo}. Ejemplo: $c.time 120000`)
      })
      return
    }

    await sock.sendMessage(jid, {
      text: whatsapp('⏱️', `Listo: ahora mueve cada ${ms} ms (${formatear(ms)})`)
    })
  }
}
