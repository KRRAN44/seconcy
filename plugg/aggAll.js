const fs = require('fs')
const path = require('path')

const miembrosPath = path.join(__dirname, '../JSON/miembros.json')

const FIRMA = '𔑳ּ᠂࡛ܐׄ𝚻𝚶𝗣𝚮ꫂ𝚩𝚵𝚰𝙁𝛳𝛮𝙂 🌱'

function armarMensaje(texto) {
    return `╭─────────────╮
          _*Seconcy $ ~V1~ 🌱🐸*_
╰─────────────╯
        *————————*
        
*—————-*
                                *——————-*

*———-* *-*`
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
        throw new Error('La raíz de JSON/miembros.json debe ser un objeto')
    }

    return miembros
}
module.exports = {
    name: 'agSeG8',

    async execute({ sock, message, jid }) {
      
        if (!jid.endsWith('@g.us')) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! Este comando fue hecho para usarse en grupos..._*' })
        }

        const metadata = await sock.groupMetadata(jid)
        const participants = metadata.participants

        
        const botNumber = sock.user.id.split(':')[0].split('@')[0]
        const numeros = new Set()
        let sinNumero = 0

        for (const p of participants) {
           
            if (p.id?.split('@')[0] === botNumber || p.phoneNumber?.split('@')[0] === botNumber) continue

           
            let numero = limpiarNumero(p.phoneNumber) || limpiarNumero(p.id)

            
            if (!numero && p.id?.endsWith('@lid')) {
                try {
                    numero = limpiarNumero(await sock.signalRepository?.lidMapping?.getPNForLID(p.id))
                } catch (error) {
                    console.error(`No se pudo resolver el número del LID ${p.id}:`, error)
                }
            }

            if (numero) numeros.add(numero)
            else sinNumero++
        }

        if (numeros.size === 0) {
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! No encontré números de teléfono en este grupo..._*' })
        }
        
        let nuevos = 0

        try {
            const miembros = leerMiembros()
            const guardados = Array.isArray(miembros[jid]) ? miembros[jid] : []

            nuevos = [...numeros].filter(n => !guardados.includes(n)).length
            miembros[jid] = [...new Set([...guardados, ...numeros])]

            fs.writeFileSync(miembrosPath, JSON.stringify(miembros, null, 2), 'utf8')
        } catch (error) {
            console.error('Error al guardar en miembros.json:', error)
            return sock.sendMessage(jid, { text: '> *_[ 🍤 ] ERROR! No pude leer o guardar miembros.json, parece que está dañado..._*' })
        }
       
        const lineas = [
            `> 📋 Números encontrados en el grupo: *${numeros.size}*`,
            `> ✅ Guardados nuevos: *${nuevos}*`,
            `> ➖ Ya estaban guardados: *${numeros.size - nuevos}*`
        ]

        if (sinNumero > 0) {
            lineas.push(`> ❔ Sin número (no pude resolverlo): *${sinNumero}*`)
        }

        console.log(`        [ 🗺️ ] Comando agg888 ejecutado, guardados: ${nuevos}`)

        await sock.sendMessage(jid, {
            text: armarMensaje(`> _terminé con !agg888_\n${lineas.join('\n')}`)
        })
    }
}