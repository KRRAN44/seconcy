const fs = require('fs');
const path = require('path');
const meta = await sock.groupMetadata(from)
const jids = meta.participants.map(p => p.id)

const archivoContenido = path.join(__dirname, '../contenido/contenido.txt');

let spamActivo = {};

module.exports = {
    name: 'sec.activate',
    aliases: ['spam'],
    
    async execute({ sock, message, jid }) {
        // El mensaje que va a spamear (puedes cambiarlo)
        const mensajeSpam = fs.readFileSync(archivoContenido, 'utf8');
        
        // Intervalo en milisegundos (1000 = 1 segundo)
        const intervalo = 760;

        if (!spamActivo[jid]) {
            // ACTIVAR spam
            spamActivo[jid] = setInterval(async () => {
                try {
                    await sock.sendMessage(jid, {
                        text: mensajeSpam,
                        mentions: jids });
                } catch (error) {
                    console.error('Error en spam:', error);
                }
            }, intervalo);

            await sock.sendMessage(jid, {
                text: `𝐒𝟕$𝐊𝐈𝐋𝐋𝗘𝐑 〽️😂`
            });
        } else {
            // DESACTIVAR spam
            clearInterval(spamActivo[jid]);
            spamActivo[jid] = null;

            await sock.sendMessage(jid, {
                text: '🌴'
            });
        }
    }
};
