// ======================================================
// $404 - Cola de 2 minutos
// Cada INTERVALO_MS saca 1 usuario de JSON/pre-miem.json, lo pasa
// a JSON/miembros.json y lo borra de pre-miem.json en ese mismo paso.
// 5 segundos después lo quita de miembros.json.
// Se puede usar en grupos y en chats privados (también desde el número del bot).
// Se detiene con $ST404 (plugg/st404.js).
// $golpe (plugg/golpe.js) usa moverTodos() para mover toda la cola de una vez.
// $c.time (plugg/ctime.js) cambia INTERVALO_MS en milisegundos.
// !c.mover (plugg/cmover.js) usa pasarTodoAMiembros() para traspasar todo y vaciar pre-miem.json.
// ======================================================
const fs = require('fs')
const path = require('path')

// Estamos en plugg/, así que ../JSON es la carpeta JSON del proyecto
const PRE_MIEMBROS_PATH = path.join(__dirname, '..', 'JSON', 'pre-miem.json')
const MIEMBROS_PATH = path.join(__dirname, '..', 'JSON', 'miembros.json')
let INTERVALO_MS = 2 * 60 * 1000
const ESPERA_ANTES_DE_QUITAR_MS = 5 * 1000
const { consola, whatsapp } = require('../decoracion')

function estimarCola(datos) {
  const total = Object.values(datos).reduce((n, lista) => n + (Array.isArray(lista) ? lista.length : 0), 0)
  const minutos = total * INTERVALO_MS / 60000
  return { total, minutos }
}

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
    consola('$404', `${usuario} salió de miembros.json; ${grupo}`)
  } catch (error) {
    consola('$404', `no se pudo quitar ${usuario} de miembros.json: ${error.message}`, false)
  }
}

// Cada INTERVALO_MS: sacar 1 usuario de pre-miem.json y pasarlo a miembros.json
function moverUno() {
  try {
    const preMiembros = leerJSON(PRE_MIEMBROS_PATH)
    const grupo = Object.keys(preMiembros).find(g =>
      Array.isArray(preMiembros[g]) && preMiembros[g].length > 0
    )
    if (!grupo) {
      consola('$404', 'cola vacía; nada que mover')
      return
    }
    // Paso 1: sacar al primero de la lista (todavía solo en memoria)
    const usuario = preMiembros[grupo].shift()
    if (typeof usuario !== 'string' || !usuario.trim()) {
      guardarJSON(PRE_MIEMBROS_PATH, preMiembros)
      consola('$404', `entrada inválida descartada; ${grupo}`, false)
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
      consola('$404', `${usuario} ya estaba registrado; duplicado retirado`)
      return
    }
    consola('$404', `${usuario} pasó a miembros.json; ${grupo}`)
  } catch (error) {
    consola('$404', `error al mover número: ${error.message}`, false)
  }
}

// Usado por $golpe: mueve toda la cola de una sola vez y regresa cuántos salieron
function moverTodos() {
  const antes = estimarCola(leerJSON(PRE_MIEMBROS_PATH)).total
  for (let i = 0; i < antes; i++) {
    moverUno()
  }
  const despues = estimarCola(leerJSON(PRE_MIEMBROS_PATH)).total
  return antes - despues
}

// Usado por $c.time: cambia cada cuánto se mueve un número (en milisegundos)
function cambiarIntervalo(ms) {
  if (!Number.isInteger(ms) || ms < 1000) {
    return { ok: false, motivo: 'pon un número entero de al menos 1000 ms (1 segundo)' }
  }
  INTERVALO_MS = ms
  // Si el $404 ya está activo, reinicia el reloj con el nuevo tiempo
  if (intervalo) {
    clearInterval(intervalo)
    intervalo = setInterval(moverUno, INTERVALO_MS)
  }
  consola('$c.time', `intervalo cambiado a ${ms} ms`)
  return { ok: true }
}

// Regresa el tiempo actual en milisegundos
function intervaloActual() {
  return INTERVALO_MS
}

// Usado por !c.mover: traspasa TODO de pre-miem.json a miembros.json y deja pre-miem.json vacío
function pasarTodoAMiembros() {
  const preMiembros = leerJSON(PRE_MIEMBROS_PATH)
  const miembros = leerJSON(MIEMBROS_PATH)
  let pasados = 0

  for (const grupo of Object.keys(preMiembros)) {
    if (!Array.isArray(preMiembros[grupo])) continue
    const lista = Array.isArray(miembros[grupo]) ? miembros[grupo] : []

    for (const usuario of preMiembros[grupo]) {
      if (typeof usuario !== 'string' || !usuario.trim()) continue
      if (!lista.includes(usuario)) {
        lista.push(usuario)
        pasados++
      }
    }

    miembros[grupo] = lista
  }

  // Primero se guarda miembros.json; si eso falla, pre-miem.json no se toca y nadie se pierde.
  guardarJSON(MIEMBROS_PATH, miembros)
  // Ya todo está en miembros.json, así que la cola queda completamente vacía
  guardarJSON(PRE_MIEMBROS_PATH, {})
  consola('!c.mover', `${pasados} números pasaron a miembros.json; pre-miem.json vacío`)
  return pasados
}

module.exports = {
  name: '404',
  async execute({ sock, jid }) {
    if (intervalo) {
      await sock.sendMessage(jid, {
        text: whatsapp('🍒', '$404 ya está activo; usa $ST404 para detenerlo')
      })
      return
    }
    intervalo = setInterval(moverUno, INTERVALO_MS)
    const cola = estimarCola(leerJSON(PRE_MIEMBROS_PATH))
    const estimado = cola.minutos < 60 ? `${cola.minutos} min` : `${Math.floor(cola.minutos / 60)} h ${cola.minutos % 60} min`
    consola('$404', `activo; ${cola.total} números, aprox. ${estimado}`)
    await sock.sendMessage(jid, {
      text: whatsapp('🛰️', `Transporte activo; ${cola.total} números, aprox. ${estimado}`)
    })
  },
  // Lo usa st404.js para detener la cola
  detener() {
    if (!intervalo) return false
    clearInterval(intervalo)
    intervalo = null
    consola('$ST404', 'cola detenida')
    return true
  },
  // Lo usa golpe.js para mover toda la cola de inmediato
  moverTodos,
  // Lo usa ctime.js para cambiar y leer el intervalo
  cambiarIntervalo,
  intervaloActual,
  // Lo usa cmover.js para traspasar todo a miembros.json
  pasarTodoAMiembros
}
