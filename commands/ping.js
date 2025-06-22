// File: commands/ping.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { t } = require('../utils/i18n');
const { loadChatById } = require('../db/chats');

module.exports = {
  name: 'ping',
  aliases: ['a'],
  description: '', // Dynamisch, siehe Getter unten
  get description() {
    // Dynamische Beschreibung je nach Sprache
    // Fallback: Deutsch
    return t('ping_description', 'de') || 'Antwortet mit Bot-Latenz und optional Netzwerk-Latenz.';
  },
  async execute({ m, send, args }) {
    let lang = 'de';
    try {
      const chat = await loadChatById(m.chat);
      if (chat && chat.language) lang = chat.language;
    } catch {}
    const home = process.env.HOME || process.env.USERPROFILE;
    // Speedtest-Binary-Pfad ggf. per Umgebungsvariable überschreibbar
    let speedtestBin = process.env.SPEEDTEST_BIN || path.join(home, 'speedtest');
    const start = Date.now();
    // Wenn "full" oder "speed" als Argument, dann Speedtest, sonst nur Ping
    const doSpeedtest = args && (args.includes('full') || args.includes('speed'));
    exec('ping -c 1 google.de', async (error, stdout, stderr) => {
      const pingEnd = Date.now();
      const match = stdout.match(/time=([\d.]+) ms/);
      const pingTime = match ? match[1] : null;
      const botReaction = pingEnd - start;
      let msg = '🏓 *Pong!*';
      msg += `\n🤖 ${t('ping_bot_reaction', lang, { ms: botReaction })}`;
      if (pingTime) {
        msg += `\n🌐 ${t('ping_network_latency', lang, { ms: pingTime })}`;
      } else if (error) {
        msg += `\n🌐 ${t('ping_network_unavailable', lang, { error: stderr || error.message })}`;
      }
      if (doSpeedtest) {
        // Speedtest mit Ookla-Binary
        exec(`${speedtestBin} --accept-license --accept-gdpr -f json`, { timeout: 30000, maxBuffer: 1024 * 1024 }, async (err, out, serr) => {
          try {
            if (out && out.trim().startsWith('{')) {
              const result = JSON.parse(out);
              if (result.download && result.upload && result.ping) {
                msg += `\n\n🚀 *${t('ping_speedtest', lang)}*: `;
                msg += `\n• Ping: ${result.ping.latency.toFixed(1)} ms`;
                msg += `\n• Download: ${(result.download.bandwidth * 8 / 1e6).toFixed(2)} Mbit/s`;
                msg += `\n• Upload: ${(result.upload.bandwidth * 8 / 1e6).toFixed(2)} Mbit/s`;
              } else {
                msg += `\n\n🚀 ${t('ping_speedtest_incomplete', lang)}`;
              }
            } else if (err) {
              msg += `\n\n🚀 ${t('ping_speedtest_unavailable', lang, { error: serr || err.message })}`;
            } else {
              msg += `\n\n🚀 ${t('ping_speedtest_no_output', lang)}`;
            }
          } catch (e) {
            msg += `\n\n🚀 ${t('ping_speedtest_parse_error', lang, { error: e.message })}`;
          }
          msg += `\n\n${t('ping_tip', lang)}`;
          await send({ chat: m.chat, text: msg, parse_mode: 'Markdown' });
        });
      } else {
        msg += `\n\n${t('ping_tip_speedtest', lang)}`;
        await send({ chat: m.chat, text: msg, parse_mode: 'Markdown' });
      }
    });
  }
};
