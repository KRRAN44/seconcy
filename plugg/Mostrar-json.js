const fs = require('fs')
const path = require('path')
const RUTA_JSON = path.join(__dirname, '..', 'JSON', 'pre-miem.json')
const MAX_CARACTERES = 3500
const { consola, whatsapp } = require('../decoracion')

module.exports = {
  name: 'cat',
  async execute({ sock, message, jid }) {
    const quien = message.key.participant || message.key.remoteJid
    consola('$cat', `recibido de ${quien}`)
    let data
    try {
      data = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'))
      consola('$cat', 'pre-miem.json leído')
    } catch (error) {
      consola('$cat', `no se pudo leer pre-miem.json: ${error.message}`, false)
      await sock.sendMessage(jid, { text: whatsapp('🍒', 'No pude leer pre-miem.json') }, { quoted: message })
      return
    }

    let total = 0
    const bloques = []
    for (const [grupo, lista] of Object.entries(data)) {
      if (!Array.isArray(lista) || lista.length === 0) continue
      total += lista.length
      const numeros = lista.map(n => `• ${String(n).replace('@s.whatsapp.net', '')}`)
      bloques.push(`*[ 🥥 ] . . ${grupo}*\n${numeros.join('\n')}`)
    }
    if (total === 0) {
      consola('$cat', 'pre-miem.json está vacío', false)
      await sock.sendMessage(jid, { text: whatsapp('🍒', 'pre-miem.json está vacío') }, { quoted: message })
      return
    }

    const texto = `${whatsapp('🌊', `${total} números en la cola`)}\n\n${bloques.join('\n\n')}`
    const partes = []
    for (let i = 0; i < texto.length; i += MAX_CARACTERES) partes.push(texto.slice(i, i + MAX_CARACTERES))
    for (let i = 0; i < partes.length; i++) {
      await sock.sendMessage(jid, { text: partes[i] }, i === 0 ? { quoted: message } : {})
      consola('$cat', `parte ${i + 1}/${partes.length} enviada`)
    }
    consola('$cat', `${total} números enviados en ${partes.length} partes`)
  }
}
