const {
  findByPlatform,
  findBySerialNumber,
  decrypt
} = require('../db/users');
const { createSendFunction } = require('../send');
const { loadChatById } = require('../db/chats');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'connect',
  aliases: ['verbinden'],
  description: 'Plattformübergreifende Registrierung: !connect <MasterSN>',

  get description() {
    // Dynamische Beschreibung je nach Chat-Sprache (m.chat ist immer vorhanden)
    return async function(m) {
      const chatDb = await loadChatById(m.chat);
      const lang = (chatDb && chatDb.sprache) || 'de';
      return t('connect_description', lang);
    };
  },

  async execute({ args, m, send }) {
    // Sprache aus Chat-DB laden
    const chatDb = await loadChatById(m.chat);
    const lang = (chatDb && chatDb.sprache) || 'de';

    const platform = m.platform;
    const senderId = m.sender;

    // 1) Das Kind (Child-User) ermitteln
    const childUser = await findByPlatform(platform, senderId);
    if (!childUser) {
      return send({
        chat: m.chat,
        text: t('connect_not_registered', lang)
      });
    }

    // 2) Master-SN aus den Argumenten lesen
    const masterSN = (args[0] || '').toUpperCase();
    if (!masterSN) {
      return send({
        chat: m.chat,
        text: t('connect_no_sn', lang)
      });
    }

    // 3) Master-User anhand SN suchen
    const masterUser = await findBySerialNumber(masterSN);
    if (!masterUser) {
      return send({
        chat: m.chat,
        text: t('connect_no_user', lang, { sn: masterSN })
      });
    }

    // 4) Sicherstellen, dass ChildSN ≠ MasterSN
    if (childUser.serialNumber === masterUser.serialNumber) {
      return send({
        chat: m.chat,
        text: t('connect_self', lang)
      });
    }

    // 5) Ermitteln, auf welcher Plattform der Master registriert ist
    let targetPlatform = null;
    let targetId = null;

    if (Array.isArray(masterUser.whatsappNumbers) && masterUser.whatsappNumbers.length > 0) {
      try {
        targetPlatform = 'whatsapp';
        targetId = decrypt(masterUser.whatsappNumbers[0]);
      } catch (e) {
        console.error('Kann WhatsApp-Nummer des Masters nicht entschlüsseln:', e);
        return send({
          chat: m.chat,
          text: t('connect_wa_error', lang)
        });
      }
    } else if (masterUser.telegramId) {
      targetPlatform = 'telegram';
      targetId = masterUser.telegramId;
    } else if (masterUser.discordId) {
      targetPlatform = 'discord';
      targetId = masterUser.discordId;
    } else {
      return send({
        chat: m.chat,
        text: t('connect_no_platform', lang)
      });
    }

    // 6) Erzeuge eine send-Funktion für die Zielplattform
    let connTarget, sendTarget;
    switch (targetPlatform) {
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
    try {
      sendTarget = createSendFunction(targetPlatform, connTarget);
    } catch (e) {
      console.error('Fehler beim Erzeugen der Send-Funktion:', e);
      return send({
        chat: m.chat,
        text: t('connect_send_error', lang)
      });
    }

    // 7) Text-Nachricht für den Master formulieren
    const childSN = childUser.serialNumber;
    const childName = childUser.accounts?.[0]?.name || 'unbekannter Benutzer';

    const requestText =
      t('connect_request', lang, { childName, childSN }) +
      `\n\n` +
      t('connect_request_hint', lang, { childSN });

    // 8) Anfrage an den Master senden
    try {
      await sendTarget({ chat: targetId, text: requestText });
    } catch (e) {
      console.error('Fehler beim Senden an Master:', e);
      return send({
        chat: m.chat,
        text: t('connect_master_unreachable', lang)
      });
    }

    // 9) Rückmeldung an das Child
    return send({
      chat: m.chat,
      text: t('connect_sent', lang, { sn: masterSN })
    });
  }
};