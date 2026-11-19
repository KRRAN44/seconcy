const { consola, whatsapp } = require('../decoracion')

module.exports = {
  name: 'ping',
  async execute({ sock, jid }) {
    const inicio = Date.now()
    const enviado = await sock.sendMessage(jid, {
      text: whatsapp('🫟', `> _*Seconcy figura*_`)
    })
    const ms = Date.now() - inicio
    consola('ping', `${ms} ms`)
    await sock.sendMessage(jid, {
      text: whatsapp('🐉', `> _*Ping en: ${ms}ms....*_`),
      edit: enviado.key
    })
  }
}
