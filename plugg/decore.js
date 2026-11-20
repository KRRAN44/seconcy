const fs = require('fs')
const path = require('path')

const FOTO_DIR = path.join(__dirname, '..', 'decore')
const EXTENSIONES_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const NOMBRE_PATH = path.join(__dirname, '..', 'recursos', 'nombre.txt')
const { consola, whatsapp } = require('../decoracion')

module.exports = {
  name: 'decore',

  async execute({ sock, jid, message }) {
    try {
      if (!fs.existsSync(FOTO_DIR)) throw new Error('No existe la carpeta decore/.')
      if (!fs.existsSync(NOMBRE_PATH)) {
        throw new Error('No existe recursos/nombre.txt.')
      }

      const fotos = fs.readdirSync(FOTO_DIR).filter(archivo => {
        const ruta = path.join(FOTO_DIR, archivo)
        return EXTENSIONES_IMAGEN.has(path.extname(archivo).toLowerCase()) && fs.statSync(ruta).isFile()
      })
      if (!fotos.length) throw new Error('No hay fotos en la carpeta decore/.')

      const fotoPath = path.join(FOTO_DIR, fotos[Math.floor(Math.random() * fotos.length)])
      const foto = fs.readFileSync(fotoPath)
      const nombre = fs.readFileSync(NOMBRE_PATH, 'utf8').trim()
      if (!foto.length) throw new Error('La foto seleccionada está vacía.')
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
