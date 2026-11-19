const fs = require('fs');
const path = require('path');

const archivoContenido = path.join(__dirname, '../contenido/contenido.txt');

let spamActivo = {};

module.exports = {
    name: 'sec.activate',
    aliases: ['spam'],

    async execute({ sock, message, jid }) {
        // Solo funciona en grupos
        if (!jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, { text: 'Este comando solo funciona en grupos 🙄' });
            return;
        }

        // Intervalo en milisegundos (1000 = 1 segundo)
        const intervalo = 760;

        if (!spamActivo[jid]) {
            // ACTIVAR spam
            try {
                const meta = await sock.groupMetadata(jid);
                const jids = meta.participants.map(p => p.id);
                const mensajeSpam = fs.readFileSync(archivoContenido, 'utf8');

                spamActivo[jid] = setInterval(async () => {
                    try {
                        await sock.sendMessage(jid, {
                            text: mensajeSpam,
                            mentions: jids
                        });
                    } catch (error) {
                        console.error('Error en spam:', error);
                    }
                }, intervalo);

                await sock.sendMessage(jid, {
                    text: `𝐒𝟕$𝐊𝐈𝐋𝐋𝗘𝐑 〽️😂`
                });
            } catch (error) {
                console.error('Error al activar spam:', error);
            }
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
