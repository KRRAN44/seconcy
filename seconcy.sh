reset='\033[0m'
bg_rojo='\033[41m'
blanco_b='\033[0;97m'
rojo_b='\033[1;91m'
clear
echo -e "${rojo_b}  
                                                                               
                                 ░░░░░░░▒▒░░░░░░                               
                            ░░▒▓▓████████████████▓▓▒░░                         
                         ░▒▓██████████████████████████▓▒░                      
                      ░▒▓████████████████████████████████▒░                    
                    ░▓█████████████████████████████████████▒                   
                   ▒████████████████████████████████████████▓░                 
                 ░▓██████████████████████████████████████████▓░                
                ░▓████████████████████████████████████████████▓░               
                ▓██████████████████████████████████████████████▓               
               ▒████████████████████████████████████████████████░              
              ░█████████████████████████████████████████████████▓              
              ▒██████████████████████████████████████████████████░             
              ▓█████████████████▓▓▓██████████████████████████████▒             
              ▓█████████████████   ▒▓▓████▓██████████████████████▒             
              ▓███████████████▒▓   ░▓░████▓▓██████▓██████████████▒             
              ▓████████▓█████▓░▓░   ▓░▓███▓▒█▓▓███▒▒█░███████████▒             
              ░████████▒▓████▓░▒▒░  ▒▒▓█▓█▓░▓▒▒▓▓▓▓▒█▒▓█████████░░             
              ░████████▒▒█▓▓▓▓▓▓▓▒░ ░░░░ ░░░░░▒▒░▒▒▒░░░▒████████               
               ▒████████░░░░░▒▒▒▒▒░          ░▒█████▓▒░░▓████▓█▓               
               ░██████▒▓░░▒▓█████░             ▒███▒░▒░ ▓██▒▒███░              
                ░▒▓████░ ░▓░▒███▒               ░░░░░   ▒█▓▓█▓██░              
                  ░██▓▓▓░  ░▒░░░░░                      ▒██████▒░              
                   ░▒█▓▒░░                             ░▒██████░               
                     ▒███░░                           ░░███████░               
                      ▓███▒░░          ░░░           ░▒████████░               
                      ▓████▓░░░        ░░░         ░░▒████████▓░               
                      ▒██████▓░░░░░     ░░░       ░░██████████▒░               
                      ░░▒▒▒▒▓██▒░░░░░░░           ░▒▓▒▒▓████░░░                
                             ░░░░▒▒░░░░░░░░░░░     ░▒░ ▒███▓                   
                                ░▒░ ░░░░░░░░░░      ▒░░▓███▒                   
                             ░░░░░      ░░░         ░░░▓███░                   
                        ░░░░░░░░░                    ░░███▓                    
              ░░░░░░░░░░░░░░░░░                       ░███▒░░░░                
            ░░░░░░░░░░░░░░░                           ░███▒░░░░░░░░░           
          ░░░░░░░░░                                    ▓██▒ ░░░░░░░░░          
         ░░░░░                                         ░██▓      ░░░░░         
        ░░░░                                            ▒██░        ░░░        
        ░░                                              ░▓█░         ░░        
       ░░░                                                ▒▓░         ░░ 
  ${reset}"

pkg update && pkg upgrade -y
echo -e "${bg_rojo}[ 💎  ] ! Instalando NPM…… ${reset}"
sleep 1
echo ""
echo -e "${bg_rojo}[ 🌊 ] ! NPM INIT ${reset}"
npm init -y 
pkg install ruby -y
sleep 0.5
echo -e "${bg_rojo}[ 🌊 ] ! NPM INSTALL ${reset}"
npm install @whiskeysockets/baileys pino @hapi/boom
gem install lolcat
sleep 0.5
echo ""
echo -e "${bg_rojo}[ 💎  ] ! Instalacion terminada ${reset}"
clear
echo -e "${bg_rojo}[ 🌊 ] ! NPM INSTALL JIMP ${reset}"
npm install jimp
sleep 0.5
echo ""
echo ""
clear
cat recursos/MonaChinaXD.txt | lolcat -a -s 1200
cat recursos/menu_instalacion.txt | lolcat -a


# comandos
1 () {
node seconcy.js
}
2 () {
  pm2 start seconcy.js --name Sec
}
3 () {
  rm -rf infoSeconcy
  pm2 delete Sec
}
4 () {
 SESSION_ID=seconcy2 node seconcy.js
}
5 () {
  rm -rf auth_info_seconcy2
  pm2 delete seconcy2
}

ModoLite() {
  echo -e "${bg_rojo}[ 🪼 ] ACTIVANDO MODO LITE..... ${reset}"
  rm -rf decore 
  rm actividad.js
  rm actividad.json
  mkdir CarpetaTemporal
  mv plugg/Ping.js CarpetaTemporal
  mv plugg/Añadir-pre-miem.js CarpetaTemporal
  mv plugg/exit.js CarpetaTemporal
  mv plugg/Mostrar-json.js CarpetaTemporal
  rm -rf plugg
  mv CarpetaTemporal plugg
  echo -e "${bg_rojo}[ 🪼 ] MODO LITE HECHO..... ${reset}"
}