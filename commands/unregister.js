// File: commands/unregister.js
// -----------------------------
// Befehl: !unregister
// Entfernt Privatchat‐User bzw. deaktiviert den Chat (Entfernen aus db).

const { findByPlatform, loadUserById, deleteUserById } = require('../db/users');
const { loadChatById, deleteChatById } = require('../db/chats');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'unregister',
  aliases: ['delme', 'exit'],
  get description() {
    return t('unregister_description', 'de');
  },
  async execute({ m, send }) {
    const platform = m.platform;
    const platformId = m.sender;
    const chatId = m.chat;
    const isGroup = chatId.endsWith('@g.us');
    const chat = await loadChatById(chatId);
    const lang = chat?.language || 'de';

    if (isGroup) {
      // 1) Gruppenchats: Lösche den Chat-Eintrag
      const chatData = await loadChatById(chatId);
      if (!chatData) {
        return send({ chat: chatId, text: t('unregister_not_found', lang) });
      }
      await deleteChatById(chatId);
      return send({
        chat: chatId,
        text: t('unregister_group_success', lang)
      });
    } else {
      // 2) Privatchat: Lösche den User und das Profilbild
      const user = await findByPlatform(platform, platformId);
      if (!user) {
        return send({ chat: chatId, text: t('unregister_not_registered', lang) });
      }
      const id = user.id;
      // Profilbild löschen, falls vorhanden
      if (user.profilePic) {
        const picPath = path.join(__dirname, '../media/profilepics/', user.profilePic);
        if (fs.existsSync(picPath)) {
          try { fs.unlinkSync(picPath); } catch {}
        }
      }
      await deleteUserById(id);
      return send({
        chat: chatId,
        text: t('unregister_user_success', lang)
      });
    }
  }
};
