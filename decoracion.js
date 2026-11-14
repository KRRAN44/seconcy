const reset = '\x1b[0m'
const verde = '\x1b[32m'
const rojo = '\x1b[31m'
const emojisConsola = ['⛵️', '🛩️', '🦠', '💊', '🩸', '🌡️', '🪬', '💈', '🧸', '📦']
const emojisWhatsApp = ['☀️', '🐲', '🌊', '🎍', '🎫', '🍓', '🥥', '🍒', '🍺', '🍻', '🍹', '🤹', '🎰', '🎲', '🛰️']

function elegir(emojis) {
  return emojis[Math.floor(Math.random() * emojis.length)]
}

function consola(comando, detalle = '', correcto = true) {
  const color = correcto ? verde : rojo
  const estado = correcto ? 'ejecutado' : 'mal ejecutado'
  const extra = detalle ? `: ${detalle}` : ''
  console.log(`${color}          [ ${elegir(emojisConsola)} ] . . ·_*${comando} ${estado}${extra}....*_${reset}`)
}

function whatsapp(_emoji, descripcion) {
  return `> _*[ ${elegir(emojisWhatsApp)} ] . . ${descripcion}...*_`
}

module.exports = { consola, whatsapp }
