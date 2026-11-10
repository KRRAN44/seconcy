const fs = require('fs')
const path = require('path')

const miembrosPath = path.join(__dirname, '../JSON/pre-miem.json')
const procesos = new Map()

function armarMensaje(texto) {
    return `╭─────────────╮
          _*Seconcy $ ~V1~ 🌱🐸*_
╰─────────────╯
        *————————*

${texto}`
}

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
                text: '> *_[ 🍤 ] ERROR! Este comando fue hecho para usarse en grupos..._*'
            })
        }

        if (/^\$?ST4$/i.test(String(text).trim())) {
            const proceso = procesos.get(jid)
            if (!proceso) return sock.sendMessage(jid, { text: '$4 no está recopilando miembros en este grupo.' })
            proceso.detener = true
            return sock.sendMessage(jid, { text: '$4 se detendrá y guardará los números que ya alcanzó a recopilar.' })
        }

        if (procesos.has(jid)) {
            return sock.sendMessage(jid, { text: '$4 ya está recopilando miembros en este grupo.' })
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
                        console.error(`No se pudo resolver el LID ${participante.id}:`, error)
                    }
                }

                if (numero) numeros.add(numero)
                else sinNumero++
            }
            if (numeros.size === 0 && !proceso.detener) {
                return await sock.sendMessage(jid, {
                    text: '> *_[ 🍤 ] ERROR! No encontré números de teléfono en este grupo..._*'
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
                `> [ 🌊 ] . . Total de *Miembros* en el grupo: _*${numeros.size}*_`,
                `——- ——- — - `,
                `> [ 🌊 ] . . Total de *Numeros* guardados en el archivo *json*: _*${nuevos}*_`,
                `————- ——- — -`,
                `> [ 🌊 ] . . Números que ya *estaban guardados* en el json: _*${numeros.size - nuevos}*_`
            ]
            if (sinNumero > 0) lineas.push(`————- —- —————-
> [ 🌊 ] . . Cuentas con número *privado*: _*${sinNumero}*_
                `)

            console.log(`Comando $4 ${proceso.detener ? 'detenido' : 'terminado'} para ${jid}; guardados nuevos: ${nuevos}`)
            const jidBot = sock.user?.id?.replace(/:\d+@/, '@')
            await sock.sendMessage(jidBot || jid, {
                text: armarMensaje(` _${proceso.detener ? '$4 detenido' : `            *_[ 🥂 ] $4_*`}_\n${lineas.join('\n')}`)
            })
        } catch (error) {
            console.error('Error recopilando o guardando participantes con $4:', error)
            await sock.sendMessage(jid, {
                text: '> *_[ 🍤 ] ERROR! No pude leer el grupo o guardar pre-miem.json..._*'
            })
        } finally {
            if (procesos.get(jid) === proceso) procesos.delete(jid)
        }
    }
}
