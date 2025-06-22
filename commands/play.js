const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const yts = require('yt-search');
const { ytdown } = require('@neelegirl/downloader'); // Passe ggf. den Pfad an!
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

function extractVideoId(url) {
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.|music\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^\s&?/]+)/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

async function search(query, options = {}) {
  const searchResults = await yts.search({ query, hl: 'de', gl: 'DE', ...options });
  return searchResults.videos;
}

module.exports = {
  name: 'play',
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('play_description', 'de') || 'Spielt YouTube-Audio im Discord-Sprachkanal oder sendet es als Datei. Nutze Link oder Suchbegriff!';
  },
  async execute({ m, send, platformApi, args }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    const searchQuery = args.join(' ').trim();
    if (!searchQuery) {
      return send({ chat: m.chat, text: t('play_no_query', lang) });
    }
    let platform = m.platform;

    // Video-ID extrahieren
    let videoId = extractVideoId(searchQuery);

    // Wenn kein Link, suche per API
    if (!videoId) {
      await send({ chat: m.chat, text: t('play_searching', lang) });
      const videos = await search(searchQuery);
      if (!videos || videos.length === 0) {
        return send({ chat: m.chat, text: t('play_no_video', lang) });
      }
      videoId = videos[0].videoId || videos[0].id;
      if (!videoId) {
        return send({ chat: m.chat, text: t('play_no_valid_video', lang) });
      }
    }

    const url = `https://youtube.com/watch?v=${videoId}`;

    // 1. Lade Download-Link von der API
    const result = await ytdown(url);
    if (!result.status || !result.data?.audio) {
      return send({ chat: m.chat, text: t('play_download_failed', lang) });
    }
    const audioUrl = result.data.audio;
    const fileName = path.join(__dirname, '../media/tmp', `ytmp3_${Date.now()}.mp3`);

    // 2. Lade die Datei temporär herunter
    try {
      const response = await axios.get(audioUrl, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(fileName);
        response.data.pipe(stream);
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    } catch (e) {
      console.log(e);
      return send({ chat: m.chat, text: t('play_download_error', lang) });
    }

    // 3. Plattformabhängig senden/abspielen
    if (platform === 'discord') {
      console.log('Discord-Play Command ausgeführt:', m.sender, m.chat, searchQuery);
      // Discord: Sprachkanal-Check
      const guild = platformApi.guilds.cache.get(m.guildId);
      if (!guild) {
        fs.unlink(fileName, () => {});
        return send({ chat: m.chat, text: t('play_no_server', lang) });
      }
      let member = guild.members.cache.get(m.sender);
      if (!member) {
        try {
          member = await guild.members.fetch(m.sender);
        } catch (e) {
          fs.unlink(fileName, () => {});
          return send({ chat: m.chat, text: t('play_no_member', lang) });
        }
      }
      if (!member.voice.channel) {
        fs.unlink(fileName, () => {});
        return send({ chat: m.chat, text: t('play_no_voice', lang) });
      }

      // Bot joint den Sprachkanal
      const connection = joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId: guild.id,
        adapterCreator: member.voice.channel.guild.voiceAdapterCreator
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
      } catch {
        fs.unlink(fileName, () => {});
        return send({ chat: m.chat, text: t('play_join_error', lang) });
      }

      // Audio abspielen
      const player = createAudioPlayer();
      const resource = createAudioResource(fileName);
      connection.subscribe(player);
      player.play(resource);

      player.once(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        fs.unlink(fileName, () => {});
      });

      await send({ chat: m.chat, text: t('play_playing', lang) });
    } else {
      // Telegram/WhatsApp: Sende Audio als Datei
      try {
        await send({
          chat: m.chat,
          audio: fs.readFileSync(fileName),
          mimetype: 'audio/mp3',
          text: t('play_audio', lang)
        });
      } catch (e) {
        await send({ chat: m.chat, text: t('play_send_error', lang) });
      }
      fs.unlink(fileName, () => {});
    }
  }
};