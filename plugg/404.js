const fs = require('fs')
const path = require('path')

const miembrosPath = path.join(__dirname, '../JSON/miembros.json')
const intervaloMs = 5000
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))
const monitores = new Map()

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

function numerosPendientes(miembros) {
    const numeros = new Set()
    for (const lista of Object.values(miembros)) {
        if (!Array.isArray(lista)) continue
        for (const valor of lista) {
            if (typeof valor === 'string' && valor.endsWith('@s.whatsapp.net')) {
                numeros.add(valor.replace(/:\d+@/, '@'))
            }
        }
    }
    return [...numeros]
}

async function validarAdmin(sock, message, jid) {
    const metadata = await sock.groupMetadata(jid)
    const participants = metadata.participants || []
    const sender = message?.key?.participant || message?.key?.remoteJid
    const senderData = participants.find(p => p.id === sender || p.phoneNumber === sender)
    if (senderData?.admin !== 'admin' && senderData?.admin !== 'superadmin') {
        throw new Error('Solo administradores pueden usar este comando.')
    }
}

module.exports = {
    name: '404',
    aliases: ['ST404'],

    async execute({ sock, message, jid, text = '' }) {
        if (!jid?.endsWith('@g.us')) {
            return sock.sendMessage(jid, { text: 'Este comando solo se puede usar en grupos.' })
        }

        if (/^\$?ST404$/i.test(String(text).trim())) {
            const monitor = monitores.get(jid)
            if (!monitor) return sock.sendMessage(jid, { text: '$404 no estaba activado en este grupo.' })
            monitor.detener = true
            return sock.sendMessage(jid, { text: '$404 se detendrá.' })
        }

        if (monitores.has(jid)) {
            return sock.sendMessage(jid, { text: '$404 ya está activado en este grupo.' })
        }
        if (monitores.size > 0) {
            return sock.sendMessage(jid, { text: '$404 ya está activado en otro grupo; detén ese proceso antes de activarlo aquí.' })
        }
        if (require('./addMasivo').hasProcess()) {
            return sock.sendMessage(jid, { text: '$690 está activado; deténlo antes de iniciar $404.' })
        }

        try {
            await validarAdmin(sock, message, jid)
            leerMiembros()
        } catch (error) {
            return sock.sendMessage(jid, { text: `No se pudo activar $404: ${error.message}` })
        }

        let yaPendientes
        try {
            yaPendientes = numerosPendientes(leerMiembros())
        } catch (error) {
            return sock.sendMessage(jid, { text: `No se pudo leer miembros.json: ${error.message}` })
        }

        const monitor = { detener: false, vistos: new Set(yaPendientes) }
        monitores.set(jid, monitor)
        await sock.sendMessage(jid, { text: '$404 activado; el temporizador empezará en cuatro minutos.' })
        console.log(`[404] Activado para el grupo ${jid}. El envío del enlace está deshabilitado.`)

        try {
            while (!monitor.detener) {
                try {
                    const pendientes = numerosPendientes(leerMiembros())
                    for (const numero of pendientes) {
                        if (monitor.vistos.has(numero)) continue
                        monitor.vistos.add(numero)
                        console.log(`[404] ${numero}: enlace omitido; no se borra de miembros.json porque no se envió ningún mensaje.`)
                    }
                } catch (error) {
                    console.error('[404] Error leyendo miembros.json:', error)
                }
                if (!monitor.detener) await esperar(intervaloMs)
            }
        } finally {
            monitores.delete(jid)
            console.log(`[404] Detenido para el grupo ${jid}.`)
        }
    },

    isActive() {
        return [...monitores.values()].some(monitor => !monitor.detener)
    },

    hasProcess() {
        return monitores.size > 0
    }
}
