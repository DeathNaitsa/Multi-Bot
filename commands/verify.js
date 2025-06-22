const {
  findByPlatform,
  findBySerialNumber,
  saveUser,
  deleteUserById,
  decrypt,
  encrypt
} = require('../db/users');
const { createSendFunction } = require('../send');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'verify',
  aliases: ['verifizieren', 'bestätigen'],
  get description() {
    return t('verify_description', 'de');
  },

  async execute({ args, m, send }) {
    const platform = m.platform;
    const senderId = m.sender;
    const chat = await loadChatById(m.chat);
    const lang = chat?.language || 'de';
    const masterUser = await findByPlatform(platform, senderId);

    if (!masterUser) {
      return send({ chat: m.chat, text: t('verify_not_registered', lang) });
    }

    const childSN = (args[0] || '').toUpperCase();
    if (!childSN) {
      return send({ chat: m.chat, text: t('verify_no_sn', lang) });
    }

    const childUser = await findBySerialNumber(childSN);
    if (!childUser) {
      return send({ chat: m.chat, text: t('verify_no_user', lang, { sn: childSN }) });
    }

    if (childUser.serialNumber === masterUser.serialNumber) {
      return send({ chat: m.chat, text: t('verify_self', lang) });
    }

    let didMerge = false;

    // WhatsApp: Alle Nummern übernehmen (ohne Duplikate)
    if (Array.isArray(childUser.whatsappNumbers)) {
      if (!Array.isArray(masterUser.whatsappNumbers)) masterUser.whatsappNumbers = [];
      for (const enc of childUser.whatsappNumbers) {
        if (!masterUser.whatsappNumbers.includes(enc)) {
          masterUser.whatsappNumbers.push(enc);
          didMerge = true;
        }
      }
    }

    // Telegram: Nur übernehmen, wenn Master noch keine Telegram-ID hat
    if (childUser.telegramId && !masterUser.telegramId) {
      masterUser.telegramId = childUser.telegramId;
      didMerge = true;
    }

    // Discord: Nur übernehmen, wenn Master noch keine Discord-ID hat
    if (childUser.discordId && !masterUser.discordId) {
      masterUser.discordId = childUser.discordId;
      didMerge = true;
    }

    if (platform === 'whatsapp') {
      if (!Array.isArray(masterUser.whatsappNumbers)) masterUser.whatsappNumbers = [];
      const enc = encrypt ? encrypt(senderId) : senderId;
      if (!masterUser.whatsappNumbers.includes(enc)) {
        masterUser.whatsappNumbers.push(enc);
        didMerge = true;
      }
    } else if (platform === 'telegram') {
      if (!masterUser.telegramId) {
        masterUser.telegramId = senderId;
        didMerge = true;
      }
    } else if (platform === 'discord') {
      if (!masterUser.discordId) {
        masterUser.discordId = senderId;
        didMerge = true;
      }
    }

    if (!didMerge) {
      return send({
        chat: m.chat,
        text: t('verify_no_merge', lang)
      });
    }

    await saveUser(masterUser);
    await deleteUserById(childUser.id);

    await send({
      chat: m.chat,
      text: t('verify_success', lang, { sn: childSN })
    });

    // Child auf allen Plattformen benachrichtigen
    const notifyChild = async (platform, id) => {
      let connChild;
      switch (platform) {
        case 'whatsapp':
          connChild = global.connWA;
          break;
        case 'telegram':
          connChild = global.botTelegram;
          break;
        case 'discord':
          connChild = global.discordClient;
          break;
      }
      try {
        const sendChild = createSendFunction(platform, connChild);
        await sendChild({
          chat: id,
          text: t('verify_child_notify', lang, { childSN, masterSN: masterUser.serialNumber })
        });
      } catch (e) {
        // Ignorieren, falls Versand fehlschlägt
      }
    };

    if (Array.isArray(childUser.whatsappNumbers)) {
      for (const enc of childUser.whatsappNumbers) {
        let id;
        try { id = decrypt(enc); } catch { continue; }
        await notifyChild('whatsapp', id);
      }
    }
    if (childUser.telegramId) {
      await notifyChild('telegram', childUser.telegramId);
    }
    if (childUser.discordId) {
      await notifyChild('discord', childUser.discordId);
    }
  }
};