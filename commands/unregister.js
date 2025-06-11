// File: commands/unregister.js
// -----------------------------
// Befehl: !unregister
// Entfernt Privatchat‐User bzw. deaktiviert den Chat (Entfernen aus db).

const { findByPlatform, loadUserById, deleteUserById } = require('../db/users');
const { loadChatById, deleteChatById } = require('../db/chats');

module.exports = {
  name: 'unregister',
  aliases: ['delme', 'exit'],
  description: 'Entfernt diesen Chat bzw. dein Konto aus der Datenbank (DSGVO-konform).',

  async execute({ m, send }) {
    const platform = m.platform;
    const platformId = m.sender;
    const chatId = m.chat;
    const isGroup = chatId.endsWith('@g.us');

    if (isGroup) {
      // 1) Gruppenchats: Lösche den Chat-Eintrag
      const chatData = await loadChatById(chatId);
      if (!chatData) {
        return send({ chat: chatId, text: 'Dieser Chat ist nicht registriert.' });
      }
      await deleteChatById(chatId);
      return send({
        chat: chatId,
        text: '✅ Dieser Gruppen-Chat wurde aus der Datenbank entfernt. Alle Bot-Commands sind deaktiviert.'
      });
    } else {
      // 2) Privatchat: Lösche den User
      const user = await findByPlatform(platform, platformId);
      if (!user) {
        return send({ chat: chatId, text: 'Du bist nicht registriert.' });
      }
      const id = user.id;
      await deleteUserById(id);
      return send({
        chat: chatId,
        text:
          '✅ Dein Konto wurde aus der Datenbank gelöscht. ' +
          'Du musst dich erneut mit `!reg Name.Alter` registrieren, wenn du den Bot weiter nutzen möchtest.'
      });
    }
  }
};
