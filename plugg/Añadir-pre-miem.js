const fs = require('fs')
const path = require('path')

const miembrosPath = path.join(__dirname, '../JSON/pre-miem.json')
const procesos = new Map()
const { consola, whatsapp } = require('../decoracion')

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
        throw new Error('La raíz de JSON/pre-miem.json debe ser un objeto')
    }
    return miembros
}

module.exports = {
    name: '4',
    aliases: ['ST4'],

    async execute({ sock, jid, text = '' }) {
        if (!jid?.endsWith('@g.us')) {
            return sock.sendMessage(jid, {
                text: whatsapp('🍒', 'Este comando solo funciona en grupos')
            })
        }

        if (/^\$?ST4$/i.test(String(text).trim())) {
            const proceso = procesos.get(jid)
            if (!proceso) return sock.sendMessage(jid, { text: whatsapp('🍒', '$4 no está activo en este grupo') })
            proceso.detener = true
            return sock.sendMessage(jid, { text: whatsapp('🎫', '$4 se detendrá y guardará los números recopilados') })
        }

        if (procesos.has(jid)) {
            return sock.sendMessage(jid, { text: whatsapp('🍒', '$4 ya está recopilando miembros') })
        }

        const proceso = { detener: false }
        procesos.set(jid, proceso)
        const numeros = new Set()
        let sinNumero = 0
        try {
            const metadata = await sock.groupMetadata(jid)
            const botNumber = sock.user?.id?.split(':')[0].split('@')[0]

            for (const participante of metadata.participants || []) {
                if (proceso.detener) break
                if (
                    participante.id?.split('@')[0] === botNumber ||
                    participante.phoneNumber?.split('@')[0] === botNumber
                ) continue

                let numero = limpiarNumero(participante.phoneNumber) || limpiarNumero(participante.id)
                if (!numero && participante.id?.endsWith('@lid')) {
                    try {
                        const telefono = await sock.signalRepository?.lidMapping?.getPNForLID(participante.id)
                        numero = limpiarNumero(telefono)
                    } catch (error) {
                        consola('$4', `no se pudo resolver un participante: ${error.message}`, false)
                    }
                }

                if (numero) numeros.add(numero)
                else sinNumero++
            }
            if (numeros.size === 0 && !proceso.detener) {
                return await sock.sendMessage(jid, {
                    text: whatsapp('🍒', 'No encontré números de teléfono en el grupo')
                })
            }

            let nuevos = 0
            if (numeros.size > 0) {
                const miembros = leerMiembros()
                const guardados = Array.isArray(miembros[jid]) ? miembros[jid] : []
                const unicosPrevios = new Set(guardados)
                nuevos = [...numeros].filter(numero => !unicosPrevios.has(numero)).length
                miembros[jid] = [...new Set([...guardados, ...numeros])]
                fs.writeFileSync(miembrosPath, JSON.stringify(miembros, null, 2), 'utf8')
            }

            const lineas = [
                whatsapp('🌊', `${numeros.size} miembros encontrados`),
                `——- ——- — - `,
                whatsapp('🎫', `${nuevos} números nuevos guardados`),
                `————- ——- — -`,
                whatsapp('🥥', `${numeros.size - nuevos} números ya estaban guardados`)
            ]
            if (sinNumero > 0) lineas.push(whatsapp('🍒', `${sinNumero} cuentas sin número visible`))

            consola('$4', `${proceso.detener ? 'detenido' : 'terminado'}; ${numeros.size} números, ${nuevos} nuevos`)
            const jidBot = sock.user?.id?.replace(/:\d+@/, '@')
            await sock.sendMessage(jidBot || jid, {
                text: `${whatsapp('🎍', `$4 ${proceso.detener ? 'detenido' : 'completado'}; ${numeros.size} números`)}\n${lineas.join('\n')}`
            })
        } catch (error) {
            consola('$4', `no se pudo leer o guardar participantes: ${error.message}`, false)
            await sock.sendMessage(jid, {
                text: whatsapp('🍒', 'No pude leer el grupo o guardar pre-miem.json')
            })
        } finally {
            if (procesos.get(jid) === proceso) procesos.delete(jid)
        }
    }
}
