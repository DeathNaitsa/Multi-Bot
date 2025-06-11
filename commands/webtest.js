const { findByPlatform } = require('../db/users');
module.exports = {
  name: 'webtest',
  aliases: ['wt'],
  description: 'Testet die Web-Integration',

  async execute({ m,args, send }) {
    const platform = args[0]  // 'whatsapp' oder 'telegram' oder 'discord'
    const platformId = args[1]   // Telefonnummer, Telegram-ID oder Discord-ID

    // 1) Prüfen, ob der User existiert
    const user = await findByPlatform(platform, platformId);
    if (!user) {
      return send({ chat: m.chat, text: '❗ Du bist nicht registriert.' });
    }

    // 2) Testnachricht senden
    return send({ chat: m.chat, text: `✅ Webtest erfolgreich für ${user.name} (${platform})` });
  }
};