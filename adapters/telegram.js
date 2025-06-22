const TelegramBot = require('node-telegram-bot-api');
const { createSendFunction } = require('../send'); 
const { debug } = require('../utils/debug');
const { getGroupMembers, isUserAdmin, isBotAdmin } = require('../utils/groupfunctions');
const { logGroupEvent } = require('../utils/groupEvents');

module.exports = function startTelegramAdapter(handleIncoming) {
  const token = process.env.TELEGRAM_TOKEN 
  const bot = new TelegramBot(token, { polling: true });

  const send = createSendFunction('telegram', bot);

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const senderId = msg.from.id.toString();

    // Text extrahieren
    const text = msg.text || '';

    // Bild extrahieren (falls vorhanden)
    let image = null;
    if (msg.photo && msg.photo.length > 0) {
      // Nimm das größte Bild
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      image = await bot.getFileLink(fileId);
    }

    // Video extrahieren (falls vorhanden)
    let video = null;
    if (msg.video) {
      const fileId = msg.video.file_id;
      video = await bot.getFileLink(fileId);
    }

    const mIncoming = {
      platform: 'telegram',
      sender: senderId,
      chat: chatId,
      text,
      msgRaw: msg,
      image,
      video,
      // Gruppenfunktionen verfügbar machen
      getGroupMembers: (api = bot) => getGroupMembers({ ...mIncoming, chat: chatId }, api),
      isUserAdmin: (userId, api = bot) => isUserAdmin({ ...mIncoming, chat: chatId }, userId, api),
      isBotAdmin: (api = bot) => isBotAdmin({ ...mIncoming, chat: chatId }, api)
    };

    debug('Telegram: handleIncoming', mIncoming);
    try {
      await handleIncoming(mIncoming, send);
    } catch (e) {
      debug('Telegram: Fehler in handleIncoming', e);
      console.error('Fehler in handleIncoming (Telegram):', e);
    }
  });

  // Gruppen-Events für Telegram
  bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id.toString();
    const groupName = msg.chat.title || chatId;
    msg.new_chat_members.forEach(member => {
      logGroupEvent('welcome', chatId, {
        user: member.username || member.first_name || member.id,
        group: groupName
      }, (text, opts) => bot.sendMessage(chatId, text, opts));
    });
  });
  bot.on('left_chat_member', (msg) => {
    const chatId = msg.chat.id.toString();
    const groupName = msg.chat.title || chatId;
    const user = msg.left_chat_member;
    logGroupEvent('leave', chatId, {
      user: user.username || user.first_name || user.id,
      group: groupName
    }, (text, opts) => bot.sendMessage(chatId, text, opts));
  });
  // Promote/Demote/Kick sind in Telegram nicht direkt als Event verfügbar, können aber über Admin-Änderungen erkannt werden (optional)

  console.log('Telegram-Adapter gestartet.');
  return bot;
};