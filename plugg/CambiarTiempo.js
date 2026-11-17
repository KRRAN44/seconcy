const { cambiarIntervalo, intervaloActual } = require('./Transporte')
const { consola, whatsapp } = require('../decoracion')

function formatear(ms) {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${ms / 1000} s`
  return `${ms / 60000} min`
}

// Saca el último número que encuentre, sin importar si args es arreglo, texto o trae el nombre del comando
function sacarNumero(args) {
  const texto = Array.isArray(args) ? args.join(' ') : String(args ?? '')
  const numeros = texto.match(/\d+/g)
  return numeros ? Number(numeros[numeros.length - 1]) : null
}

module.exports = {
  name: 'c.time',
  async execute({ sock, jid, args }) {
    consola('$c.time', `args recibido: ${JSON.stringify(args)}`) // debug: bórralo cuando funcione

    const ms = sacarNumero(args)

    // Sin número: solo muestra el tiempo actual
    if (ms === null) {
      const actual = intervaloActual()
      await sock.sendMessage(jid, {
        text: whatsapp('⏱️', `Tiempo actual: ${actual} ms (${formatear(actual)})`)
      })
      return
    }

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
