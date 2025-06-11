const { findByPlatform } = require('../db/users');

module.exports = {
  name: 'sn',
  aliases: ['serial', 'nummer', 'serialnumber'],
  description: 'Zeigt deine eigene Seriennummer (SN) an.',

  async execute({ m, send }) {
    const user = await findByPlatform(m.platform, m.sender);
    if (!user || !user.serialNumber) {
      return send({
        chat: m.chat,
        text: '❌ Keine Seriennummer gefunden. Bitte registriere dich zuerst!'
      });
    }
    return send({
      chat: m.chat,
      text: `🔑 Deine Seriennummer (SN):\n\`${user.serialNumber}\``
    });
  }
};