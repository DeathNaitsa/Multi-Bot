// File: commands/ping.js
module.exports = {
  name: 'ping',
  aliases: [],
  description: 'Antwortet mit Pong!',
  async execute({ m, send }) {
    await send({ chat: m.chat, text: 'Pong!' });
  }
};
