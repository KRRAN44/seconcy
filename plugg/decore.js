const fs = require('fs')
const path = require('path')

const FOTO_PATH = path.join(__dirname, '..', 'recursos', 'IMG_2585.jpg')
const NOMBRE_PATH = path.join(__dirname, '..', 'recursos', 'nombre.txt')
const { consola, whatsapp } = require('../decoracion')

module.exports = {
  name: 'decore',

  async execute({ sock, jid, message }) {
    try {
      if (!fs.existsSync(FOTO_PATH)) {
        throw new Error('No existe recursos/perfil.jpeg.')
      }
      if (!fs.existsSync(NOMBRE_PATH)) {
        throw new Error('No existe recursos/nombre.txt.')
      }

      const foto = fs.readFileSync(FOTO_PATH)
      const nombre = fs.readFileSync(NOMBRE_PATH, 'utf8').trim()
      if (!foto.length) throw new Error('recursos/perfil.jpeg está vacío.')
      if (!nombre) throw new Error('recursos/nombre.txt está vacío.')
      if (!sock.user?.id) throw new Error('No pude identificar la cuenta del bot.')

      await sock.updateProfilePicture(sock.user.id, foto)
      await sock.updateProfileName(nombre)

      consola('$decore', `perfil actualizado: ${nombre}`)
      await sock.sendMessage(jid, {
        text: whatsapp('🎍', `Perfil actualizado: ${nombre}`)
      }, { quoted: message })
    } catch (error) {
      consola('$decore', `no se pudo actualizar el perfil: ${error.message}`, false)
      await sock.sendMessage(jid, {
        text: whatsapp('🍒', `No se pudo actualizar el perfil: ${error.message}`)
      }, { quoted: message })
    }
  }
}
