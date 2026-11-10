// ======================================================
// $404 - Cola de 2 minutos
// Cada 2 minutos saca 1 usuario de JSON/pre-miem.json, lo pasa
// a JSON/miembros.json y lo borra de pre-miem.json en ese mismo paso.
// 5 segundos después lo quita de miembros.json.
// Lo puede usar cualquier integrante del grupo, incluido el número del bot.
// Se detiene con $ST404 (plugg/st404.js).
// ======================================================
const fs = require('fs')
const path = require('path')

const reset = '\x1b[0m';
const amarillo = '\x1b[33m';

const TAG = '[$404]'
// Estamos en plugg/, así que ../JSON es la carpeta JSON del proyecto
const PRE_MIEMBROS_PATH = path.join(__dirname, '..', 'JSON', 'pre-miem.json')
const MIEMBROS_PATH = path.join(__dirname, '..', 'JSON', 'miembros.json')
const INTERVALO_MS = 2 * 60 * 1000
const ESPERA_ANTES_DE_QUITAR_MS = 5 * 1000

let intervalo = null

function leerJSON(ruta) {
  if (!fs.existsSync(ruta)) return {}
  const contenido = fs.readFileSync(ruta, 'utf8').trim()
  if (!contenido) return {}
  const datos = JSON.parse(contenido)
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error(`La raíz de ${path.basename(ruta)} debe ser un objeto`)
  }
  return datos
}

function guardarJSON(ruta, datos) {
  const temporal = `${ruta}.${process.pid}.tmp`
  fs.writeFileSync(temporal, JSON.stringify(datos, null, 2), 'utf8')
  fs.renameSync(temporal, ruta)
}

// Paso 3: 5 segundos después de moverlo, quitar al usuario de miembros.json
function quitarDeMiembros(grupo, usuario) {
  try {
    const miembros = leerJSON(MIEMBROS_PATH)
    if (!Array.isArray(miembros[grupo])) return
    const antes = miembros[grupo].length
    miembros[grupo] = miembros[grupo].filter(n => n !== usuario)
    if (miembros[grupo].length === antes) return
    guardarJSON(MIEMBROS_PATH, miembros)
    console.log(`${TAG} ${usuario} salió de miembros.json (${grupo}).`)
  } catch (error) {
    console.error(`${TAG} No se pudo quitar ${usuario} de miembros.json:`, error)
  }
}

// Cada 2 minutos: sacar 1 usuario de pre-miem.json y pasarlo a miembros.json
function moverUno() {
  try {
    const preMiembros = leerJSON(PRE_MIEMBROS_PATH)
    const grupo = Object.keys(preMiembros).find(g =>
      Array.isArray(preMiembros[g]) && preMiembros[g].length > 0
    )
    if (!grupo) {
      console.log(`${TAG} pre-miem.json está vacío; no hay nadie que mover.`)
      return
    }
    // Paso 1: sacar al primero de la lista (todavía solo en memoria)
    const usuario = preMiembros[grupo].shift()
    if (typeof usuario !== 'string' || !usuario.trim()) {
      guardarJSON(PRE_MIEMBROS_PATH, preMiembros)
      console.log(`${TAG} Descarté una entrada inválida de pre-miem.json (${grupo}).`)
      return
    }
    const miembros = leerJSON(MIEMBROS_PATH)
    const lista = Array.isArray(miembros[grupo]) ? miembros[grupo] : []
    const yaEstaba = lista.includes(usuario)
    if (!yaEstaba) {
      lista.push(usuario)
      miembros[grupo] = lista
      // Paso 2: entrar a miembros.json y programar su salida.
      // La salida se programa ANTES de tocar pre-miem.json: si esa escritura falla,
      // igual se quita de miembros.json y no se queda pegado ahí.
      guardarJSON(MIEMBROS_PATH, miembros)
      setTimeout(() => quitarDeMiembros(grupo, usuario), ESPERA_ANTES_DE_QUITAR_MS)
    }
    // Paso 4: borrar al usuario de pre-miem.json (aquí se completa el traspaso)
    guardarJSON(PRE_MIEMBROS_PATH, preMiembros)
    if (yaEstaba) {
      // Ya era miembro de verdad: no lo borramos de miembros.json para no quitarle su lugar
      console.log(`${TAG} ${usuario} ya estaba en miembros.json (${grupo}); solo lo quité de pre-miem.json.`)
      return
    }
    console.log(`${TAG} ${usuario} pasó de pre-miem.json a miembros.json (${grupo}).`)
  } catch (error) {
    console.error(`${TAG} Error moviendo un usuario:`, error)
  }
}

// Solo funciona en grupos. Cualquier integrante del grupo (y el propio
// número del bot, que también es integrante) puede usarlo.
function puedeUsarlo(jid) {
  return jid.endsWith('@g.us')
}

module.exports = {
  name: '404',
  puedeUsarlo,
  async execute({ sock, jid }) {
    if (!puedeUsarlo(jid)) {
      await sock.sendMessage(jid, {
        text: '🚫 $404 solo funciona en grupos.'
      })
      return
    }
    if (intervalo) {
      await sock.sendMessage(jid, {
        text: '⚠️ $404 ya está activo. Para detenerlo usa $ST404.'
      })
      return
    }
    intervalo = setInterval(moverUno, INTERVALO_MS)
    console.log(`${amarillo}… . . [ 🏆 ] . . …. ACTIVADO ${reset}`)
    await sock.sendMessage(jid, {
      text: `> … . . [ 🏆 ] . . …. *_ACTIVADO: ~$404~_*`
    })
  },
  // Lo usa st404.js para detener la cola
  detener() {
    if (!intervalo) return false
    clearInterval(intervalo)
    intervalo = null
    console.log(`${TAG} Detenido con $ST404.`)
    return true
  }
}
