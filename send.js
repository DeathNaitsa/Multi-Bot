// ...existing code...
module.exports = {
  /**
   * Gibt die plattform-angepasste Send-Funktion zurück.
   * @param {string} platform - z.B. 'whatsapp', 'discord', 'telegram'
   * @param {Object} conn       - Die Adapter-Instanz (z.B. Baileys-Socket für WhatsApp)
   * @returns {function({chat: string, text?: string, image?: string|Buffer, video?: string|Buffer, audio?: string|Buffer, mimetype?: string, quoted?: Object}): Promise<any>}
   */
  createSendFunction(platform, conn) {
    switch (platform) {
      case 'whatsapp':
        return async function send({ chat, text, image, video, audio, mimetype, quoted, file }) {
          let payload = {};
          if (file) {
            if (Buffer.isBuffer(file)) {
              payload = { document: file, mimetype: mimetype || 'application/octet-stream', fileName: 'file' };
            } else if (file.buffer) {
              payload = { document: file.buffer, mimetype: file.mimetype || 'application/octet-stream', fileName: file.fileName || 'file' };
            } else if (file.url) {
              payload = { document: { url: file.url }, mimetype: file.mimetype || 'application/octet-stream', fileName: file.fileName || 'file' };
            } else {
              payload = { document: file };
            }
            if (text) payload.caption = text;
          } else if (audio) {
            payload = { audio: typeof audio === 'string' ? { url: audio } : audio, mimetype: mimetype || 'audio/mp3' };
            if (text) payload.caption = text;
          } else if (image) {
            payload = { image: typeof image === 'string' ? { url: image } : image };
            if (text) payload.caption = text;
          } else if (video) {
            payload = { video: typeof video === 'string' ? { url: video } : video };
            if (text) payload.caption = text;
          } else {
            payload = { text: text || '' };
          }
          const options = quoted ? { quoted: quoted } : {};
          return conn.sendMessage(chat, payload, options);
        };
      case 'discord':
        return async function send({ chat, text, image, video, audio, quoted, file }) {
          const channel = await conn.channels.fetch(chat);
          if (!channel) throw new Error('Discord-Kanal nicht gefunden: ' + chat);
          const files = [];
          if (file) files.push(typeof file === 'string' ? file : { attachment: file });
          if (audio) files.push(typeof audio === 'string' ? audio : { attachment: audio });
          if (image) files.push(typeof image === 'string' ? image : { attachment: image });
          if (video) files.push(typeof video === 'string' ? video : { attachment: video });
          const messagePayload = {
            content: text || '',
            files: files.length ? files : undefined
          };
          if (quoted && quoted.msgRaw && quoted.msgRaw.id) {
            messagePayload.reply = { messageReference: quoted.msgRaw.id };
          }
          return channel.send(messagePayload);
        };
      case 'telegram':
        return async function send({ chat, text, image, video, audio, quoted, file }) {
          const opts = {};
          if (quoted && quoted.message_id) {
            opts.reply_to_message_id = quoted.message_id;
          }
          if (file) {
            return conn.sendDocument(chat, file, { caption: text, ...opts });
          }
          if (audio) {
            return conn.sendAudio(chat, audio, { caption: text, ...opts });
          }
          if (image) {
            return conn.sendPhoto(chat, image, { caption: text, ...opts });
          }
          if (video) {
            return conn.sendVideo(chat, video, { caption: text, ...opts });
          }
          return conn.sendMessage(chat, text || '', opts);
        };
      default:
        throw new Error(`No send function defined for platform "${platform}"`);
    }
  }
};
