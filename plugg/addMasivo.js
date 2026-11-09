const fs = require('fs')
const path = require('path')

const miembrosPath = path.join(__dirname, '../JSON/miembros.json')
const intervaloMs = 5000
const intervaloAltaMs = 4 * 60 * 1000
const esperas = ms => new Promise(resolve => setTimeout(resolve, ms))

// Un monitor independiente por grupo; se cancela con $690!!.
const monitores = new Map()

function limpiarNumero(jid) {
    if (typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) return null
    return jid.replace(/:\d+@/, '@')
}

function leerMiembros() {
    if (!fs.existsSync(miembrosPath)) return {}
    const contenido = fs.readFileSync(miembrosPath, 'utf8').trim()
    if (!contenido) return {}
    const miembros = JSON.parse(contenido)
    if (!miembros || typeof miembros !== 'object' || Array.isArray(miembros)) {
        throw new Error('La raíz de JSON/miembros.json debe ser un objeto')
    }
    return miembros
}

function guardarMiembros(miembros) {
    const temporal = `${miembrosPath}.${process.pid}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(miembros, null, 2), 'utf8')
    fs.renameSync(temporal, miembrosPath)
}

function numerosPendientes(miembros) {
    const numeros = new Set()
    for (const lista of Object.values(miembros)) {
        if (!Array.isArray(lista)) continue
        for (const valor of lista) {
            const numero = limpiarNumero(valor)
            if (numero) numeros.add(numero)
        }
    }
    return [...numeros]
}

function quitarNumero(miembros, numero) {
    let cambiado = false
    for (const [grupo, lista] of Object.entries(miembros)) {
        if (!Array.isArray(lista)) continue
        const filtrada = lista.filter(valor => limpiarNumero(valor) !== numero)
        if (filtrada.length !== lista.length) {
            miembros[grupo] = filtrada
            cambiado = true
        }
    }
    if (cambiado) guardarMiembros(miembros)
}

async function validarPermisos(sock, jid, message) {
    const metadata = await sock.groupMetadata(jid)
    const participants = metadata.participants || []
    const sender = message?.key?.participant || message?.key?.remoteJid
    const senderData = participants.find(p => p.id === sender || p.phoneNumber === sender)
    if (senderData?.admin !== 'admin' && senderData?.admin !== 'superadmin') {
        throw new Error('Solo administradores pueden usar este comando.')
    }
    const botNumber = sock.user?.id?.split(':')[0].split('@')[0]
    const botData = participants.find(p =>
        p.id?.split('@')[0] === botNumber || p.phoneNumber?.split('@')[0] === botNumber
    )
    if (botData?.admin !== 'admin' && botData?.admin !== 'superadmin') {
        throw new Error('El bot necesita ser administrador para añadir participantes.')
    }
    return { metadata, participants, botNumber }
}

module.exports = {
    name: '690',
    aliases: ['ST690'],

    async execute({ sock, message, jid, text = '' }) {
        if (!jid?.endsWith('@g.us')) {
            return sock.sendMessage(jid, { text: 'Este comando solo se puede usar en grupos.' })
        }

        const detener = /^\$?ST690$/i.test(String(text).trim())
        if (detener) {
            const monitor = monitores.get(jid)
            if (!monitor) return sock.sendMessage(jid, { text: '690 no estaba activado.' })
            monitor.detener = true
            return sock.sendMessage(jid, { text: '690 detenido.' })
        }

        if (monitores.has(jid)) {
            return sock.sendMessage(jid, { text: '690 ya está activado en este grupo.' })
        }
        if (monitores.size > 0) {
            return sock.sendMessage(jid, { text: '690 ya está activado en otro grupo; detén ese proceso antes de activarlo aquí.' })
        }
        if (require('./404').hasProcess()) {
            return sock.sendMessage(jid, { text: '$404 está activado; deténlo antes de iniciar $690.' })
        }

        try {
            await validarPermisos(sock, jid, message)
            leerMiembros() // Verifica que el archivo sea legible antes de activar.
        } catch (error) {
            return sock.sendMessage(jid, { text: `No se pudo activar 690: ${error.message}` })
        }

        const monitor = { detener: false, intentados: new Set(), siguienteAlta: 0 }
        monitores.set(jid, monitor)
        await sock.sendMessage(jid, { text: '690 activado' })

        while (!monitor.detener) {
            try {
                const pendientes = numerosPendientes(leerMiembros())
                if (pendientes.length) {
                    const numero = pendientes.find(candidato => !monitor.intentados.has(candidato))
                    if (!numero) {
                        if (!monitor.detener) await esperas(intervaloMs)
                        continue
                    }
                    const { participants, botNumber } = await validarPermisos(sock, jid, message)
                    const yaEsta = participants.some(p =>
                        limpiarNumero(p.phoneNumber) === numero || limpiarNumero(p.id) === numero
                    ) || numero === `${botNumber}@s.whatsapp.net`

                    // No volver a procesar un miembro que ya estaba en este grupo.
                    if (yaEsta) {
                        quitarNumero(leerMiembros(), numero)
                    } else {
                        if (Date.now() < monitor.siguienteAlta) {
                            if (!monitor.detener) await esperas(Math.min(intervaloMs, monitor.siguienteAlta - Date.now()))
                            continue
                        }
                        let resultado
                        try {
                            resultado = await sock.groupParticipantsUpdate(jid, [numero], 'add')
                        } catch (error) {
                            monitor.intentados.add(numero)
                            monitor.siguienteAlta = Date.now() + intervaloAltaMs
                            console.log(`[ ❗️] ${numero} no se añadio`)
                            throw error
                        }
                        monitor.siguienteAlta = Date.now() + intervaloAltaMs
                        // La respuesta puede identificar al añadido con un @lid;
                        // como enviamos un solo número, basta confirmar status 200.
                        const exito = Array.isArray(resultado) && resultado.some(r =>
                            String(r.status) === '200'
                        )
                        if (exito) {
                            console.log(`[ 🐸] ${numero} añadido`)
                            quitarNumero(leerMiembros(), numero)
                        }
                        else {
                            monitor.intentados.add(numero)
                            console.log(`[ ❗️] ${numero} no se añadio`)
                            const estados = Array.isArray(resultado)
                                ? resultado.map(r => `${r.status ?? 'sin estado'}${r.jid ? ` (${r.jid})` : ''}`).join(', ')
                                : 'respuesta inesperada'
                            console.log(`[690] WhatsApp no confirmó el alta (${estados}); el número seguirá pendiente en JSON.`)
                        }
                    }
                }
            } catch (error) {
                console.error('[690] Error durante el monitoreo:', error)
            }
            if (!monitor.detener) await esperas(intervaloMs)
        }

        monitores.delete(jid)
    },

    isActive() {
        return [...monitores.values()].some(monitor => !monitor.detener)
    },

    hasProcess() {
        return monitores.size > 0
    }
}
