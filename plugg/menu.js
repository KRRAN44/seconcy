const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'catcont',
    aliases: ['xyz', '$'],

    async execute({ sock, jid }) {
        
        console.log(`        [ 🗺️ ] catcont ejecutado`);

        const menuPath = path.join(__dirname, '../contenido/contenido.txt');
        const imagePath = path.join(__dirname, '../recursos/Aseconcy.jpeg');

        const menu = fs.readFileSync(menuPath, 'utf8');
        const image = fs.readFileSync(imagePath);

        await sock.sendMessage(jid, {
            image: image,
            caption: menu
        });
    }
};