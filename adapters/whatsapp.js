// Plattformunabhängiges mIncoming-Objekt für WhatsApp

const wa = require('@deathnaitsa/wa-api');
const { createSendFunction } = require('../send');
const { debug } = require('../utils/debug');
const { logGroupEvent } = require('../utils/groupEvents');
const { getGroupMembers, isUserAdmin, isBotAdmin } = require('../utils/groupfunctions');
wa.setCredentialsDir('./sessions')

module.exports = async function startWhatsAppAdapter(handleIncoming) {
  let conn;
  try {
    conn = await wa.startSession('session1');
  } catch (e) {
    console.error('Fehler beim Starten der WhatsApp‐Session:', e);
    return;
  }

  const send = createSendFunction('whatsapp', conn);

  // Helper: Extrahiere Bild/Video (Buffer oder URL, je nach wa-api)
  function extractMedia(msg) {
    let image = null, video = null;
    if (msg.message?.imageMessage) {
      image = msg.message.imageMessage.url || msg.message.imageMessage;
    }
    if (msg.message?.videoMessage) {
      video = msg.message.videoMessage.url || msg.message.videoMessage;
    }
    return { image, video };
  }

  // Welcome-Event für WhatsApp (Baileys-Style)
  if (conn.ev && typeof conn.ev.on === 'function') {
    conn.ev.on('group-participants.update', async (update) => {
      const chatId = update.id;
      if (!update.participants || !Array.isArray(update.participants)) return;
      for (const participant of update.participants) {
        let groupName = chatId;
        try {
          const meta = await conn.groupMetadata(chatId);
          groupName = meta.subject || chatId;
        } catch {}
        if (update.action === 'add') {
          logGroupEvent('welcome', chatId, {
            user: participant.split('@')[0],
            group: groupName
          }, (msg, opts) => conn.sendMessage(chatId, { text: msg }, opts));
        } else if (update.action === 'remove') {
          logGroupEvent('leave', chatId, {
            user: participant.split('@')[0],
            group: groupName
          }, (msg, opts) => conn.sendMessage(chatId, { text: msg }, opts));
        } else if (update.action === 'promote') {
          logGroupEvent('promote', chatId, {
            user: participant.split('@')[0],
            group: groupName
          }, (msg, opts) => conn.sendMessage(chatId, { text: msg }, opts));
        } else if (update.action === 'demote') {
          logGroupEvent('kick', chatId, {
            user: participant.split('@')[0],
            group: groupName
          }, (msg, opts) => conn.sendMessage(chatId, { text: msg }, opts));
        }
      }
    });

    conn.ev.on('messages.upsert', async (mUpsert) => {
      const msgList = mUpsert.messages;
      if (!msgList || msgList.length === 0) return;
      const msg = msgList[0];
      if (!msg.message || msg.key.fromMe) return;

      const chatId = msg.key.remoteJid;
      const senderId = msg.key.participant || msg.key.remoteJid;
      let messageType = 'Unknown';
      let messageContent = '';
      let messageContentw = '';
      let both = '';
      let reactedMessageId;
      let mentionedPersonOrGroup;
      let groupMentions = [];
      let message = msg.message;

      if (message?.extendedTextMessage) {
        messageType = 'ExtendedText';
        reactedMessageId = message.extendedTextMessage.contextInfo?.stanzaId;
        groupMentions = message.extendedTextMessage.contextInfo?.groupMentions || [];
        mentionedPersonOrGroup =
          message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
          message?.extendedTextMessage?.contextInfo?.participant || '';
        if (msg.pushName) {
          messageContent = message.extendedTextMessage.text;
        } else {
          messageContent = 'bot';
          mentionedPersonOrGroup = 'null'
          messageContent = 'bot';
          both = message.extendedTextMessage.text;
        }
        messageContentw = message.extendedTextMessage.contextInfo?.quotedMessage?.conversation || '';
      } else if (message?.stickerMessage) {
        messageType = 'Sticker';
        messageContentw = message?.stickerMessage?.contextInfo?.quotedMessage?.conversation || '';
        reactedMessageId = message?.stickerMessage?.contextInfo?.stanzaId;
        messageContent="sticker"
      } else if (message?.imageMessage) {
        messageType = 'Image';
        messageContent = message?.imageMessage?.caption || '';
      } else if (message?.videoMessage) {
        messageType = 'Video';
        messageContent = message?.videoMessage?.caption || '';
      } else if (message?.audioMessage) {
        messageType = 'Audio';
      } else if (message?.conversation) {
        messageType = 'Text';
        if (msg.pushName) {
          messageContent = message.conversation;
        } else {
          messageContent = 'bot';
          mentionedPersonOrGroup = 'null'
        }
      } else if (message?.templateButtonReplyMessage) {
        messageType = "Button";
        messageContent = `${message.templateButtonReplyMessage.selectedId}`;
      } else if (message?.interactiveResponseMessage) {
        messageType = "Button";
        let but = message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson;
        var json = JSON.parse(but);
        var id = json.id;
        messageContent = id;
      }
      let text = messageContent || '';
      // Bild/Video extrahieren
      const { image, video } = extractMedia(msg);

      // Einheitliches mIncoming-Objekt
      const mIncoming = {
        platform: 'whatsapp',
        sender: senderId,
        lid: msg.key.participant_lid,
        chat: chatId,
        text,
        msgRaw: msg,
        image,
        video,
        mentionedJid: mentionedPersonOrGroup,
        // Gruppenfunktionen verfügbar machen
        getGroupMembers: (api = conn) => getGroupMembers({ ...mIncoming, chat: chatId }, api),
        isUserAdmin: (userId, api = conn) => isUserAdmin({ ...mIncoming, chat: chatId }, userId, api),
        isBotAdmin: (api = conn) => isBotAdmin({ ...mIncoming, chat: chatId }, api)
      };

      debug('WhatsApp: handleIncoming', mIncoming);
      try {
        await handleIncoming(mIncoming, send);
      } catch (err) {
        debug('WhatsApp: Fehler in handleIncoming', err);
        console.error('Fehler in handleIncoming:', err);
      }
    });
  }
  // B) Statische Variante
  else if (typeof wa.onMessageReceived === 'function') {
    wa.onMessageReceived(async (mUpsert) => {
      console.log('Neue Nachricht empfangen:', mUpsert);
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

      debug('WhatsApp: handleIncoming', mIncoming);
      try {
        await handleIncoming(mIncoming, send);
      } catch (err) {
        debug('WhatsApp: Fehler in handleIncoming', err);
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