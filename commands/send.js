const {
  findByPlatform,
  findBySerialNumber,
  decrypt
} = require('../db/users');
const { createSendFunction } = require('../send');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'send',
  aliases: ['senden'],
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('send_description', 'de') || 'Sendet eine Nachricht an einen anderen User (Plattformübergreifend).';
  },
  async execute({ args, m, send }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    const platform = m.platform;
    const senderId = m.sender;

    // 1) Das Kind (Child-User) ermitteln
    const childUser = await findByPlatform(platform, senderId);
    if (!childUser) {
      return send({
        chat: m.chat,
        text: t('not_registered', lang)
      });
    }

    // 2) Welche plattform ?
    const platfrm = (args[0] || '').toLowerCase();

    // 3) wo hin die Nachricht senden?
    const jid = (args[1] || '')

    // 4) Nachricht die gesendet werden soll
    const messages = (args.slice(2) || []).join(' ');
    if (!platfrm || !['whatsapp','telegram','discord'].includes(platfrm)) {
      return send({ chat: m.chat, text: t('send_usage', lang) });
    }
    if (!jid) {
      return send({ chat: m.chat, text: t('send_no_target', lang) });
    }
    if (!messages) {
      return send({ chat: m.chat, text: t('send_no_message', lang) });
    }
    let connTarget;
    switch (platfrm) {
      case 'whatsapp':
        connTarget = global.connWA;
        break;
      case 'telegram':
        connTarget = global.botTelegram;
        break;
      case 'discord':
        connTarget = global.discordClient;
        break;
    }
    if (!connTarget) {
      return send({ chat: m.chat, text: t('send_no_connection', lang, { platfrm }) });
    }
    let sendTarget = createSendFunction(platfrm, connTarget);

    await sendTarget({ chat: jid, text: messages });


    // 9) Rückmeldung an das Child
    return send({
      chat: m.chat,
      text: t('send_success', lang, { platfrm, jid, messages }) + '\n' + t('send_info', lang)
    });
  }
};