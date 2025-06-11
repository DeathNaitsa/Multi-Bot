// File: adapters/whatsapp.js
// Plattformunabhängiges mIncoming-Objekt für WhatsApp

const wa = require('@deathnaitsa/wa-api');
const { createSendFunction } = require('../send');

module.exports = async function startWhatsAppAdapter(handleIncoming) {
  let conn;
  try {
    conn = await wa.startSession('test-session');
  } catch (e) {
    console.error('Fehler beim Starten der WhatsApp‐Session:', e);
    return;
  }

  const send = createSendFunction('whatsapp', conn);

  // Helper: Extrahiere Bild/Video (Buffer oder URL, je nach wa-api)
  function extractMedia(msg) {
    let image = null, video = null;
    if (msg.message?.imageMessage) {
      // Je nach wa-api: Buffer, Stream oder URL
      image = msg.message.imageMessage.url || msg.message.imageMessage;
    }
    if (msg.message?.videoMessage) {
      video = msg.message.videoMessage.url || msg.message.videoMessage;
    }
    return { image, video };
  }

  // A) Baileys-Style
  if (conn.ev && typeof conn.ev.on === 'function') {
    conn.ev.on('messages.upsert', async (mUpsert) => {
      const msgList = mUpsert.messages;
      if (!msgList || msgList.length === 0) return;
      const msg = msgList[0];
      if (!msg.message || msg.key.fromMe) return;

      const chatId = msg.key.remoteJid;
      const senderId = msg.key.participant || msg.key.remoteJid;

      // Text extrahieren
      let text = '';
      if (msg.message.conversation) {
        text = msg.message.conversation;
      } else if (msg.message.extendedTextMessage?.text) {
        text = msg.message.extendedTextMessage.text;
      }

      // Bild/Video extrahieren
      const { image, video } = extractMedia(msg);

      // Einheitliches mIncoming-Objekt
      const mIncoming = {
        platform: 'whatsapp',
        sender: senderId,
        chat: chatId,
        text,
        msgRaw: msg,
        image,
        video
      };

      try {
        await handleIncoming(mIncoming, send);
      } catch (err) {
        console.error('Fehler in handleIncoming:', err);
      }
    });
  }
  // B) Statische Variante
  else if (typeof wa.onMessageReceived === 'function') {
    wa.onMessageReceived(async (mUpsert) => {
      const msgList = mUpsert.messages;
      if (!msgList || msgList.length === 0) return;
      const msg = msgList[0];
      if (!msg.message || msg.key.fromMe) return;

      const chatId = msg.key.remoteJid;
      const senderId = msg.key.participant || msg.key.remoteJid;

      let text = '';
      if (msg.message.conversation) {
        text = msg.message.conversation;
      } else if (msg.message.extendedTextMessage?.text) {
        text = msg.message.extendedTextMessage.text;
      }

      const { image, video } = extractMedia(msg);

      const mIncoming = {
        platform: 'whatsapp',
        sender: senderId,
        chat: chatId,
        text,
        msgRaw: msg,
        image,
        video
      };

      try {
        await handleIncoming(mIncoming, send);
      } catch (err) {
        console.error('Fehler in handleIncoming:', err);
      }
    });
  } else {
    console.error(
      'Konnte keinen Message‐Listener registrieren: weder conn.ev.on noch wa.onMessageReceived vorhanden.'
    );
  }

  console.log('WhatsApp‐Adapter gestartet, warte auf Nachrichten …');
  return conn;
};