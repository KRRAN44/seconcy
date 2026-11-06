const fs = require('fs')
const path = require('path')

const miembrosPath = path.join(__dirname, '../JSON/miembros.json')

// ⚙️ AJUSTES: cuántos números se añaden por tanda y cuánto se espera entre una tanda y otra.
// Entre más despacio, menos riesgo de que WhatsApp se moleste con el bot.
const POR_TANDA = 1
const PAUSA_MS = 120000 // 2 minutos

// Grupos donde ya hay un proceso corriendo (para no lanzar dos a la vez)
const enCurso = new Set()

// Grupos donde se pidió detener el proceso con "!add888 parar"
const detener = new Set()

const FIRMA = '𔑳ּ᠂࡛ܐׄ𝚻𝚶𝗣𝚮ꫂ𝚩𝚵𝚰𝙁𝛳𝛮𝙂 🌱'

// Qué significa cada código que devuelve WhatsApp al añadir (según la documentación de Baileys)
const ETIQUETAS = {
    '200': '✅ Añadidos',
    '403': '🔒 No se pudo, privacidad o permisos (403)',
    '404': '❔ Número no encontrado (404)',
    '408': '⏳ Tiempo de espera agotado (408)',
    '409': '👥 Ya estaban en el grupo (409)',
    '500': '⚠️ Error del servidor (500)'
}

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Mensaje con el mismo estilo de los demás comandos
function armarMensaje(texto) {
    return `═════════════
*🪵            ADD888*
${texto}
═════════════
${FIRMA}`
}

// Deja el número limpio: "5212223334444:12@s.whatsapp.net" -> "5212223334444@s.whatsapp.net"
// Si no es un número de teléfono (por ejemplo un @lid), regresa null
function limpiarNumero(jid) {
    if (typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) return null
    return jid.replace(/:\d+@/, '@')
}

// Junta TODOS los números de miembros.json (de todos los grupos), sin repetidos
function leerNumeros() {
    if (!fs.existsSync(miembrosPath)) return []

    const contenido = fs.readFileSync(miembrosPath, 'utf8').trim()
    if (!contenido) return []

    const miembros = JSON.parse(contenido)
    const numeros = new Set()

    for (const lista of Object.values(miembros)) {
        if (!Array.isArray(lista)) continue

        for (const jid of lista) {
            const numero = limpiarNumero(jid)
            if (numero) numeros.add(numero)
        }
    }

    return [...numeros]
}

module.exports = {
    name: 'add888',

    async execute({ sock, message, jid, args = '' }) {
        if (!jid.endsWith('@g.us')) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! Este comando fue hecho para usarse en grupos..._*' })
        }

        const metadata = await sock.groupMetadata(jid)
        const participants = metadata.participants

        // ¿Quien lo manda es admin?
        const sender = message?.key?.participant || message?.key?.remoteJid
        const senderData = participants.find(p => p.id === sender)
        const isAdmin = senderData?.admin === 'admin' || senderData?.admin === 'superadmin'

        if (!isAdmin) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! Solo admins pueden usar este comando..._*' })
        }

        // ¿El bot es admin? (sin eso no puede añadir a nadie)
        const botNumber = sock.user.id.split(':')[0].split('@')[0]
        const botData = participants.find(p => {
            const idNumber = p.id?.split('@')[0]
            const phoneNumber = p.phoneNumber?.split('@')[0]
            return idNumber === botNumber || phoneNumber === botNumber
        })
        const botIsAdmin = botData?.admin === 'admin' || botData?.admin === 'superadmin'

        if (!botIsAdmin) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! No puedo añadir gente porque no soy admin..._*' })
        }

        // !add888 parar -> detiene el proceso que está corriendo en este grupo
        if (args.trim().toLowerCase() === 'parar') {
            if (!enCurso.has(jid)) {
                return sock.sendMessage(jid, { text: '> *_[ 🍤 ] No hay ningún proceso de !add888 corriendo en este grupo..._*' })
            }

            detener.add(jid)
            return sock.sendMessage(jid, { text: armarMensaje('> _de acuerdo, me detengo cuando termine la tanda actual..._') })
        }

        if (enCurso.has(jid)) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! Ya hay un proceso de !add888 corriendo en este grupo, escribe !add888 parar para detenerlo..._*' })
        }

        // Leer los números guardados
        let numeros

        try {
            numeros = leerNumeros()
        } catch (error) {
            console.error('Error al leer miembros.json:', error)
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! No pude leer miembros.json, parece que está dañado..._*' })
        }

        if (numeros.length === 0) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! No hay números guardados en miembros.json..._*' })
        }

        // Quitar a los que ya están en el grupo (y al propio bot) para no intentar añadirlos otra vez
        const yaEstan = new Set([`${botNumber}@s.whatsapp.net`])

        for (const p of participants) {
            const porTelefono = limpiarNumero(p.phoneNumber)
            const porId = limpiarNumero(p.id)

            if (porTelefono) yaEstan.add(porTelefono)
            if (porId) yaEstan.add(porId)
        }

        const pendientes = numeros.filter(numero => !yaEstan.has(numero))
        const omitidos = numeros.length - pendientes.length

        if (pendientes.length === 0) {
            return sock.sendMessage(jid, {
                text: armarMensaje('> _todos los números de miembros.json ya están en este grupo, no hay nadie que añadir_')
            })
        }

        // Aviso de que arranca
        const tandas = Math.ceil(pendientes.length / POR_TANDA)
        const minutos = Math.ceil(((tandas - 1) * PAUSA_MS) / 60000)

        await sock.sendMessage(jid, {
            text: armarMensaje(`> _voy a intentar añadir *${pendientes.length}* números (${omitidos} ya estaban y los salté)_
> _los añado de *${POR_TANDA}* en *${POR_TANDA}*, con ${PAUSA_MS / 1000} segundos de pausa entre tandas_
> _tiempo aproximado: ${minutos < 1 ? 'menos de 1 minuto' : `${minutos} min`}_
> _para detenerlo escribe *!add888 parar*_`)
        })

        // Añadir por tandas
        enCurso.add(jid)
        detener.delete(jid)

        const resultados = {}   // cuántos hubo de cada código, por ejemplo { '200': 4, '403': 1 }
        let intentados = 0
        let motivoParo = null   // null = terminó normal, o 'error', o 'parar'

        try {
            for (let i = 0; i < pendientes.length; i += POR_TANDA) {
                if (detener.has(jid)) {
                    motivoParo = 'parar'
                    break
                }

                const tanda = pendientes.slice(i, i + POR_TANDA)

                try {
                    const respuesta = await sock.groupParticipantsUpdate(jid, tanda, 'add')

                    for (const r of respuesta) {
                        const codigo = String(r.status)
                        resultados[codigo] = (resultados[codigo] || 0) + 1

                        // El detalle (qué número falló) solo sale en tu consola, no en el grupo
                        if (codigo !== '200') {
                            console.log(`        [ 🗺️ ] add888: ${r.jid} -> código ${codigo}`)
                        }
                    }

                    intentados += tanda.length
                } catch (error) {
                    // Si WhatsApp devuelve un error, mejor parar para no empeorar las cosas
                    console.error('Error al añadir con add888:', error)
                    motivoParo = 'error'
                    break
                }

                // Pausa entre tandas (no hace falta después de la última)
                if (i + POR_TANDA < pendientes.length) {
                    await esperar(PAUSA_MS)
                }
            }
        } finally {
            enCurso.delete(jid)
            detener.delete(jid)
        }

        // Resumen: solo cantidades, sin publicar números en el grupo
        const lineas = Object.entries(resultados).map(([codigo, cantidad]) => {
            return `> ${ETIQUETAS[codigo] || `⚠️ Otro resultado (${codigo})`}: *${cantidad}*`
        })

        if (omitidos > 0) {
            lineas.push(`> ➖ Omitidos de entrada porque ya estaban: *${omitidos}*`)
        }

        const sinAnadir = pendientes.length - intentados
        let aviso = ''

        if (motivoParo === 'error') {
            aviso = `\n> ⛔ _me detuve porque WhatsApp devolvió un error, quedaron *${sinAnadir}* sin añadir. Espera un rato y vuelve a usar !add888, solo intentará con los que falten_`
        } else if (motivoParo === 'parar') {
            aviso = `\n> 🛑 _proceso detenido, quedaron *${sinAnadir}* sin añadir_`
        }

        console.log(`        [ 🗺️ ] Comando add888 ejecutado, añadidos: ${resultados['200'] || 0}`)

        await sock.sendMessage(jid, {
            text: armarMensaje(`> _terminé con !add888_\n${lineas.join('\n')}${aviso}`)
        })
    }
}
