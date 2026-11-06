# Seconcy

Bot de WhatsApp basado en Node.js y Baileys. El punto de entrada es `seconcy.js`.

## Inicio

Instala dependencias con `npm install` y arranca con `node seconcy.js`. En el primer inicio, el programa solicita el teléfono para vincular WhatsApp; también acepta `BOT_PHONE_NUMBER` con código de país. La sesión por defecto se guarda en `../infoSeconcy`; sesiones nombradas con `SESSION_ID` usan `../auth_info_<SESSION_ID>`.

## Comandos

Los módulos se cargan recursivamente desde `plugg/` (y desde `commands/`, si existe). Cada módulo CommonJS exporta `name`, una función asíncrona `execute({ sock, message, jid, args, text, prefix, commands })` y opcionalmente `aliases`. El único prefijo aceptado es `#`. Los comandos actuales son `#agg888` y `#add888`, ambos orientados a grupos y con validación de administrador.

`agg888` recoge números visibles de participantes y los guarda por grupo en `JSON/miembros.json`. Además, el evento de entrada a grupo guarda automáticamente a cada nuevo participante en la lista de ese grupo. Si WhatsApp entrega un identificador `@lid`, el bot intenta resolverlo a número; si no puede obtener el número, no puede guardar ese usuario como teléfono. `add888` lee esos números y gestiona altas por tandas; usa una pausa de dos minutos. Revisa cuidadosamente el destino y los permisos de WhatsApp antes de usarlo.

## Otras piezas

- `startup-notify.js` envía el texto y la primera imagen de `recursos/` al destinatario fijado dentro del archivo cuando la conexión abre.
- `JSON/` guarda datos persistentes de los comandos.
- `plugg/` contiene los módulos de comandos.

Al añadir comandos, exporta `name` y `execute`, mantén el módulo autocontenido y evita guardar credenciales en el repositorio. El cargador informa en consola de comandos omitidos, errores al importar y nombres de comandos desconocidos.
