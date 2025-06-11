const TelegramBot = require('node-telegram-bot-api');
const { createSendFunction } = require('../send'); 

module.exports = function startTelegramAdapter(handleIncoming) {
  const token = 'DEIN_TOKEN_HIER';
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
      video
    };

    try {
      await handleIncoming(mIncoming, send);
    } catch (e) {
      console.error('Fehler in handleIncoming (Telegram):', e);
    }
  });

  console.log('Telegram-Adapter gestartet.');
  return bot;
};