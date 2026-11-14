const { Boom } = require('@hapi/boom')
const P = require('pino')
const fs = require('fs')
const path = require('path')
const readline = require('readline/promises')
const configurarAvisoInicial = require('./startup-notify')
const PREFIX = '$'
const logger = P({ level: 'silent' })


const SESSION_ID = process.env.SESSION_ID || 'seconcy'
const TAG = `[${SESSION_ID}]`
// Carpeta donde se guarda la sesión de WhatsApp
const AUTH_DIR =
  SESSION_ID === 'seconcy'
    ? path.join(__dirname, 'infoSeconcy')
    : path.join(__dirname, 'auth_info_' + SESSION_ID)
const MIEMBROS_PATH = path.join(__dirname, 'JSON', 'miembros.json')
const PRE_MIEMBROS_PATH = path.join(__dirname, 'JSON', 'pre-miem.json')
const INTERVALO_TRANSFERENCIA_MS = 4 * 60 * 1000
const INTERVALO_REVISION_COLA_MS = 1000
let transferenciaTimer = null
let siguienteTransferencia = null
// ======================================================
// CARGAR COMANDOS
// ======================================================
function loadCommands() {
  const commands = new Map()
  // En esta instalación los comandos viven en plugg/. También aceptamos
  // commands/ para mantener compatibilidad con instalaciones futuras.
  const commandFolders = ['plugg', 'commands']
  function readFolder(folder) {
    if (!fs.existsSync(folder)) return
    for (const file of fs.readdirSync(folder)) {
      const filePath = path.join(folder, file)
      const stats = fs.statSync(filePath)
      if (stats.isDirectory()) {
        readFolder(filePath)
        continue
      }
      if (!file.endsWith('.js')) continue
      try {
        const command = require(filePath)
        if (
          !command.name ||
          typeof command.execute !== 'function'
        ) {
          console.log(`Comando ignorado: ${filePath}`)
          continue
        }
        commands.set(command.name.toLowerCase(), command)
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            commands.set(alias.toLowerCase(), command)
          }
        }
      } catch (error) {
        console.error(
          `❌ Error cargando comando ${filePath}:`,
          error
        )
      }
    }
  }
  for (const folder of commandFolders) {
    readFolder(path.join(__dirname, folder))
  }
  console.log(`┗━━╸╸╸╸╸╸╸╸╸╸╸╸╸╸╸╯🎍╭͢`)
  console.log(
    `𝜢𝜮𝑪𝜢𝜣,${commands.size}  𝑪𝜣𝜧𝜟𝜨𝑫𝜣𝑺 𝑪𝜟𝑹𝑮𝜟𝑫𝜣𝑺 𝑪𝜣𝜨 𝜮𝜩𝜤𝜪𝜣`
  )
  console.log(`┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`)
  return commands
}
const commands = loadCommands()
// ======================================================
// OBTENER TEXTO DEL MENSAJE
// ======================================================
function getMessageText(message) {
  let content = message.message
  // Quitar envolturas (chats con mensajes temporales, ver una vez, etc.);
  // sin esto el comando no se lee en esos chats.
  while (content) {
    const inner =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.documentWithCaptionMessage?.message
    if (!inner) break
    content = inner
  }
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ''
  )
}

function limpiarJidTelefono(jid) {
  if (typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) return null
  return jid.replace(/:\d+@/, '@')
}

function leerArchivoMiembros(ruta) {
  if (!fs.existsSync(ruta)) return {}
  const contenido = fs.readFileSync(ruta, 'utf8').trim()
  if (!contenido) return {}
  const datos = JSON.parse(contenido)
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error(`La raíz de ${path.basename(ruta)} debe ser un objeto`)
  }
  return datos
}

function guardarArchivoMiembros(ruta, datos) {
  const temporal = `${ruta}.${process.pid}.tmp`
  fs.writeFileSync(temporal, JSON.stringify(datos, null, 2), 'utf8')
  fs.renameSync(temporal, ruta)
}

function transferirUnNumero() {
  try {
    const preMiembros = leerArchivoMiembros(PRE_MIEMBROS_PATH)
    const grupoOrigen = Object.keys(preMiembros).find(grupo =>
      Array.isArray(preMiembros[grupo]) && preMiembros[grupo].length > 0
    )
    if (!grupoOrigen) return

    const numero = limpiarJidTelefono(preMiembros[grupoOrigen][0])
    preMiembros[grupoOrigen].shift()
    if (!numero) {
      guardarArchivoMiembros(PRE_MIEMBROS_PATH, preMiembros)
      console.log('[Cola $4] Se descartó una entrada que no era un número telefónico válido.')
      return
    }

    const miembros = leerArchivoMiembros(MIEMBROS_PATH)
    const numerosGrupo = new Set(Array.isArray(miembros[grupoOrigen]) ? miembros[grupoOrigen] : [])
    const yaEnCola = Object.values(miembros).some(lista =>
      Array.isArray(lista) && lista.some(valor => limpiarJidTelefono(valor) === numero)
    )
    if (!yaEnCola) {
      numerosGrupo.add(numero)
      miembros[grupoOrigen] = [...numerosGrupo]
      // Primero persistir el destino; si falla, la entrada sigue en pre-miem.json.
      guardarArchivoMiembros(MIEMBROS_PATH, miembros)
    } else {
      console.log(`[Cola $4] ${numero} ya estaba en miembros.json; quitaré su duplicado de pre-miem.json.`)
    }

    guardarArchivoMiembros(PRE_MIEMBROS_PATH, preMiembros)
    if (!yaEnCola) {
      console.log(`[Cola $4] ${numero} pasó de pre-miem.json a miembros.json (${grupoOrigen}).`)
    }
  } catch (error) {
    console.error('[Cola $4] No se pudo transferir el siguiente número:', error)
  }
}

function iniciarTransferenciaMiembros() {
  if (transferenciaTimer) return
  transferenciaTimer = setInterval(() => {
    const comando690 = commands.get('690')
    const comando404 = commands.get('404')
    const activa = Boolean(comando690?.isActive?.() || comando404?.isActive?.())

    if (!activa) {
      siguienteTransferencia = null
      return
    }

    if (siguienteTransferencia === null) {
      siguienteTransferencia = Date.now() + INTERVALO_TRANSFERENCIA_MS
      console.log('[Cola $4] $690 o $404 está activo; transferiré un número dentro de cuatro minutos.')
      return
    }

    if (Date.now() >= siguienteTransferencia) {
      transferirUnNumero()
      siguienteTransferencia = Date.now() + INTERVALO_TRANSFERENCIA_MS
    }
  }, INTERVALO_REVISION_COLA_MS)
  console.log('[Cola $4] Temporizador listo; la cuenta atrás comienza al activar $690 o $404.')
}

async function guardarNuevosParticipantes(sock, update) {
  const { id: jidGrupo, action, participants = [] } = update
  if (!jidGrupo?.endsWith('@g.us') || action !== 'add') return

  const nuevos = new Set()
  const numeroBot = sock.user?.id?.split(':')[0].split('@')[0]

  // No volver a encolar participantes que el propio bot acaba de añadir con $690.
  const autor = update.author || ''
  const autorTelefono = update.authorPn || ''
  if (
    autor.split(':')[0].split('@')[0] === numeroBot ||
    autorTelefono.split(':')[0].split('@')[0] === numeroBot
  ) return

  for (const participante of participants) {
    const participantJid = typeof participante === 'string'
      ? participante
      : participante?.id || participante?.jid
    let numero = limpiarJidTelefono(participante?.phoneNumber) || limpiarJidTelefono(participantJid)

    if (!numero && participantJid?.endsWith('@lid')) {
      try {
        const telefono = await sock.signalRepository?.lidMapping?.getPNForLID(participantJid)
        numero = limpiarJidTelefono(telefono)
      } catch (error) {
        console.error(`No se pudo resolver el número del participante ${participantJid}:`, error)
      }
    }

    if (numero && numero.split('@')[0] !== numeroBot) nuevos.add(numero)
  }

  if (nuevos.size > 0) {
    // Los participantes nuevos también entran a la cola de cuatro minutos.
    const preMiembros = leerArchivoMiembros(PRE_MIEMBROS_PATH)
    const numeros = new Set(Array.isArray(preMiembros[jidGrupo]) ? preMiembros[jidGrupo] : [])
    const antes = numeros.size
    for (const numero of nuevos) numeros.add(numero)
    const agregados = numeros.size - antes
    if (agregados === 0) return
    preMiembros[jidGrupo] = [...numeros]
    guardarArchivoMiembros(PRE_MIEMBROS_PATH, preMiembros)
    console.log(`✅ Encolé ${agregados} participante(s) nuevo(s) de ${jidGrupo} en JSON/pre-miem.json`)
  } else if (participants.length > 0) {
    console.log(`[Cola $4] Se detectó una entrada en ${jidGrupo}, pero WhatsApp no proporcionó un número telefónico resoluble.`)
  }
}
// ======================================================
// ¿YA ESTÁ VINCULADO?
// ======================================================
function yaEstaVinculado() {
  const credsPath = path.join(AUTH_DIR, 'creds.json')
  if (!fs.existsSync(credsPath)) return false
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
    return creds.registered === true
  } catch {
    return false
  }
}
// ======================================================
// MOSTRAR MENSAJES EN CONSOLA
// ======================================================
const BOT_INICIO = Math.floor(Date.now() / 1000)
const gruposCache = new Map()

function soloNumero(jid) {
  return (jid || '').split('@')[0].split(':')[0]
}

function describirMensaje(message) {
  let content = message.message
  // Quitar envolturas (mensajes temporales, ver una vez, etc.)
  while (content) {
    const inner =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.documentWithCaptionMessage?.message
    if (!inner) break
    content = inner
  }
  if (!content) return null
  const tipo =
    Object.keys(content).find(k => k !== 'messageContextInfo') ||
    'desconocido'
  // Mensajes internos de WhatsApp que no vale la pena mostrar
  if (
    tipo === 'protocolMessage' ||
    tipo === 'senderKeyDistributionMessage'
  ) return null
  const texto =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    ''
  const etiquetas = {
    imageMessage: 'imagen',
    videoMessage: 'video',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    documentMessage: 'documento',
    contactMessage: 'contacto',
    locationMessage: 'ubicación',
    reactionMessage: 'reacción',
    pollCreationMessage: 'encuesta'
  }
  const etiqueta = etiquetas[tipo]
  if (etiqueta) return texto ? `[${etiqueta}] ${texto}` : `[${etiqueta}]`
  return texto || `[${tipo}]`
}

async function mostrarMensaje(sock, message) {
  const jid = message.key.remoteJid
  if (!jid || jid === 'status@broadcast' || !message.message) return
  const ts =
    Number(message.messageTimestamp) || Math.floor(Date.now() / 1000)
  // Ignorar mensajes viejos que llegan al sincronizar historial
  if (ts < BOT_INICIO - 30) return
  const mensaje = describirMensaje(message)
  if (mensaje === null) return
  const esGrupo = jid.endsWith('@g.us')
  const fromMe = message.key.fromMe
  // Nombre del grupo o del chat
  let nombreChat
  if (esGrupo) {
    if (!gruposCache.has(jid)) {
      try {
        const meta = await sock.groupMetadata(jid)
        gruposCache.set(jid, meta.subject)
      } catch {}
    }
    nombreChat = gruposCache.get(jid) || soloNumero(jid)
  } else {
    nombreChat = fromMe
      ? soloNumero(jid)
      : message.pushName || soloNumero(jid)
  }
  // Número del remitente
  const remitenteJid = fromMe
    ? sock.user?.id
    : esGrupo
      ? message.key.participantAlt || message.key.participant
      : message.key.remoteJidAlt || jid
  // Hora y fecha
  const f = new Date(ts * 1000)
  const hora = f.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const fecha = `${f.getDate()}/${f.getMonth() + 1}/${f.getFullYear()}`
  console.log(
    `\n==================\n` +
    `Sesión : ${SESSION_ID}\n` +
    `Nombre : ${nombreChat}\n` +
    `Mensaje : ${mensaje}\n` +
    `Hora: ${hora} ${fecha}\n` +
    `Número : ${soloNumero(remitenteJid)}`
  )
}
// ======================================================
// INICIAR BOT
// ======================================================
async function startBot(phoneNumber) {
  const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore
  } = await import('@whiskeysockets/baileys')
  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_DIR)
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        logger
      )
    },
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false
  })
  configurarAvisoInicial(sock)
  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('group-participants.update', update => {
    guardarNuevosParticipantes(sock, update).catch(error => {
      console.error('❌ Error encolando nuevos participantes en pre-miem.json:', error)
    })
  })
  // Evitar pedir el pairing code varias veces
  let pairingRequested = false
  // ====================================================
  // CONEXIÓN
  // ====================================================
  sock.ev.on(
    'connection.update',
    async ({
      connection,
      lastDisconnect
    }) => {
      // ------------------------------------------------
      // CONECTANDO
      // ------------------------------------------------
      if (
        connection === 'connecting' &&
        !state.creds.registered &&
        !pairingRequested &&
        phoneNumber
      ) {
        pairingRequested = true
        try {
          /*
           * Esperamos un momento para que el socket
           * tenga tiempo de establecer la conexión.
           */
          await new Promise(resolve =>
            setTimeout(resolve, 1500)
          )
          const pairingCode =
            await sock.requestPairingCode(
              phoneNumber
            )
          console.log(
            `\n📱 ${TAG} Código de vinculación: ${pairingCode}`
          )
          console.log(
            'WhatsApp → Dispositivos vinculados → ' +
            'Vincular un dispositivo → ' +
            'Vincular con número de teléfono.\n'
          )
        } catch (error) {
          pairingRequested = false
          console.error(
            '❌ No se pudo obtener el código de vinculación:',
            error
          )
        }
      }
      // ------------------------------------------------
      // CONECTADO
      // ------------------------------------------------
      if (connection === 'open') {
        console.log(
          `✅ ${TAG} Bot conectado a WhatsApp.`
        )
        iniciarTransferenciaMiembros()
        // Cada comando que tenga reanudar() (Envio $202, Arrancar $480) lo
        // recibe en CADA conexión: si estaba activo en actividad.json se
        // reanuda solo, y si ya corría se queda con el socket nuevo.
        for (const comando of new Set(commands.values())) {
          if (typeof comando.reanudar !== 'function') continue
          Promise.resolve(comando.reanudar({ sock, commands })).catch(error => {
            console.error(`❌ No se pudo reanudar $${comando.name}:`, error)
          })
        }
      }
      // ------------------------------------------------
      // CONEXIÓN CERRADA
      // ------------------------------------------------
      if (connection === 'close') {
        const statusCode =
          new Boom(
            lastDisconnect?.error
          )?.output?.statusCode
        const reconnect =
          statusCode !== DisconnectReason.loggedOut
        console.log(
          `${TAG} Conexión cerrada.`,
          reconnect
            ? 'Reconectando...'
            : 'Sesión cerrada.'
        )
        if (reconnect) {
          console.log(
            '🔄 Intentando reconectar...'
          )
          setTimeout(() => {
            startBot(phoneNumber)
          }, 3000)
        } else {
          console.log(
            `⚠️ ${TAG} Elimina la carpeta ${path.basename(AUTH_DIR)} y vuelve a vincular el bot.`
          )
        }
      }
    }
  )
  // ====================================================
  // MENSAJES
  // ====================================================
  sock.ev.on(
    'messages.upsert',
    async ({ messages, type }) => {
      // Mostrar en consola todos los mensajes (recibidos y enviados)
      for (const m of messages) {
        try {
          await mostrarMensaje(sock, m)
        } catch (error) {
          console.error('❌ Error mostrando mensaje:', error)
        }
      }
      if (type !== 'notify') return
      for (const message of messages) {
      if (!message?.message) continue
      const jid = message.key.remoteJid
      // Ignorar estados
      if (!jid || jid === 'status@broadcast') continue
      // =================================================
      // GRUPOS
      // =================================================
      if (jid.endsWith('@g.us')) {
        const autor =
          message.key.participant ||
          message.key.remoteJid

      }
      // =================================================
      // TEXTO
      // =================================================
      const text =
        getMessageText(message).trim()
      if (!text.startsWith(PREFIX)) continue
      const prefix = PREFIX
      // =================================================
      // COMANDO
      // =================================================
      const commandText =
        text.slice(prefix.length).trim()
      if (!commandText) continue
      // Permite comandos de control como $690!! sin tratarlos como
      // un nombre de comando diferente ("690!!").
      const commandName =
        commandText
          .split(/\s+/)[0]
          ?.replace(/!!$/, '')
          .toLowerCase()
      const args =
        commandText
          .slice(commandName.length)
          .trimStart()
      const command =
        commands.get(commandName)
      if (!command) {
        console.log(`⚠️ Comando no encontrado: ${commandName} (prefijo ${PREFIX})`)
        continue
      }
      // =================================================
      // EJECUTAR
      // =================================================
      try {
        await command.execute({
          sock,
          message,
          jid,
          args,
          text,
          prefix,
          commands
        })
      } catch (error) {
        console.error(
          `Error en ${commandName}:`,
          error
        )
        try {
          await sock.sendMessage(
            jid,
            {
              text:
                '❌ Ocurrió un error al ejecutar ese comando.'
            }
          )
        } catch (sendError) {
          console.error(
            '❌ No se pudo enviar el mensaje de error:',
            sendError
          )
        }
      }
      }
    }
  )

}
// ======================================================
// PEDIR NÚMERO (solo si todavía no está vinculado)
// ======================================================
async function pedirNumero() {
  // Si ya hay sesión guardada, no hace falta número
  if (yaEstaVinculado()) return null
  let phoneNumber =
    process.env.BOT_PHONE_NUMBER
  if (!phoneNumber) {
    // Sin teclado (por ejemplo en pm2) no se puede preguntar
    if (!process.stdin.isTTY) {
      throw new Error(
        'El bot no está vinculado y no hay teclado para pedir el número. ' +
        `Sesión ${SESSION_ID}: vincúlala una vez ejecutando este archivo con Node.js o arráncala con ` +
        'BOT_PHONE_NUMBER=521XXXXXXXXXX.'
      )
    }
    const rl =
      readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
    phoneNumber =
      await rl.question(
        'Ingresa tu número de WhatsApp con código de país (solo dígitos): '
      )
    rl.close()
  }
  phoneNumber =
    phoneNumber.replace(
      /\D/g,
      ''
    )
  if (!phoneNumber) {
    throw new Error(
      'Debes indicar un número de WhatsApp válido con código de país.'
    )
  }
  return phoneNumber
}
// ======================================================
// ARRANCAR
// ======================================================
pedirNumero()
  .then(startBot)
  .catch(error => {
    console.error(
      'No se pudo iniciar el bot:',
      error
    )
    process.exit(1)
  })
