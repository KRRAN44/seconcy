// ======================================================
// actividad.js - ayudante para leer/guardar actividad.json
// Guarda si $480 (Arrancar) y el envío ($202, plugg/Envio.js) quedaron
// activos, para que al volver a ejecutar el bot se reanuden solos.
// Lo usan: plugg/Arrancar.js, plugg/ST-Arrancar.js y plugg/Envio.js.
// Está fuera de plugg/ a propósito
// para que el cargador de comandos no lo tome como comando.
// ======================================================
const fs = require('fs')
const path = require('path')

const ACTIVIDAD_PATH = path.join(__dirname, 'actividad.json')

// Devuelve {} si el archivo no existe, está vacío o está dañado
function leerActividad() {
  try {
    const contenido = fs.readFileSync(ACTIVIDAD_PATH, 'utf8').trim()
    if (!contenido) return {}
    const datos = JSON.parse(contenido)
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {}
  } catch {
    return {}
  }
}

// Escritura segura: primero a un temporal y luego se renombra,
// así si el bot se cae a media escritura no queda el JSON a medias
function guardarActividad(datos) {
  const temporal = `${ACTIVIDAD_PATH}.${process.pid}.tmp`
  fs.writeFileSync(temporal, JSON.stringify(datos, null, 2), 'utf8')
  fs.renameSync(temporal, ACTIVIDAD_PATH)
}

// Lee, deja que `cambiar` modifique/devuelva el objeto y lo guarda.
// Así cada comando toca solo lo suyo y no borra lo de los demás.
function actualizarActividad(cambiar) {
  const actual = leerActividad()
  const nuevo = cambiar(actual) || actual
  guardarActividad(nuevo)
  return nuevo
}

module.exports = { ACTIVIDAD_PATH, leerActividad, guardarActividad, actualizarActividad }
