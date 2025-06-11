const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const yts = require('yt-search');
const { ytdown } = require('@neelegirl/downloader'); // Passe ggf. den Pfad an!

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
  description: 'Spielt YouTube-Audio im Discord-Sprachkanal oder sendet es als Datei. Nutze Link oder Suchbegriff!',
  async execute({ m, send, platformApi, args }) {
    const searchQuery = args.join(' ').trim();
    if (!searchQuery) {
      return send({ chat: m.chat, text: '❌ Bitte gib einen YouTube-Link oder Suchbegriff an!' });
    }
    let platform = m.platform; // 'whatsapp', 'telegram' oder 'discord'

    // Video-ID extrahieren
    let videoId = extractVideoId(searchQuery);

    // Wenn kein Link, suche per API
    if (!videoId) {
      await send({ chat: m.chat, text: '🔍 Ich suche nach deinem Song...' });
      const videos = await search(searchQuery);
      if (!videos || videos.length === 0) {
        return send({ chat: m.chat, text: '❌ Kein Video gefunden!' });
      }
      videoId = videos[0].videoId || videos[0].id;
      if (!videoId) {
        return send({ chat: m.chat, text: '❌ Kein gültiges Video gefunden!' });
      }
    }

    const url = `https://youtube.com/watch?v=${videoId}`;

    // 1. Lade Download-Link von der API
    const result = await ytdown(url);
    if (!result.status || !result.data?.audio) {
      return send({ chat: m.chat, text: '❌ Download fehlgeschlagen oder kein Audio gefunden.' });
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
      return send({ chat: m.chat, text: '❌ Fehler beim Herunterladen der Audiodatei.' });
    }

    // 3. Plattformabhängig senden/abspielen
    if (platform === 'discord') {
      console.log('Discord-Play Command ausgeführt:', m.sender, m.chat, searchQuery);
      // Discord: Sprachkanal-Check
      const guild = platformApi.guilds.cache.get(m.guildId);
      if (!guild) {
        fs.unlink(fileName, () => {});
        return send({ chat: m.chat, text: '❌ Server nicht gefunden.' });
      }
      let member = guild.members.cache.get(m.sender);
      if (!member) {
        try {
          member = await guild.members.fetch(m.sender);
        } catch (e) {
          fs.unlink(fileName, () => {});
          return send({ chat: m.chat, text: '❌ Konnte dich im Server nicht finden.' });
        }
      }
      if (!member.voice.channel) {
        fs.unlink(fileName, () => {});
        return send({ chat: m.chat, text: '❌ Du bist in keinem Sprachkanal. Bitte trete einem Sprachkanal bei und führe den Command erneut aus.' });
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
        return send({ chat: m.chat, text: '❌ Konnte dem Sprachkanal nicht beitreten.' });
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

      await send({ chat: m.chat, text: '🎵 Spiele YouTube-Audio im Sprachkanal ab!' });
    } else {
      // Telegram/WhatsApp: Sende Audio als Datei
      try {
        await send({
          chat: m.chat,
          audio: fs.readFileSync(fileName),
          mimetype: 'audio/mp3',
          text: '🎵 Hier ist dein YouTube-Audio!'
        });
      } catch (e) {
        await send({ chat: m.chat, text: '❌ Fehler beim Senden der Datei.' });
      }
      fs.unlink(fileName, () => {});
    }
  }
};