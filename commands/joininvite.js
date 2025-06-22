// commands/joininvite.js
module.exports = {
  name: 'joininvite',
  description: 'Tritt einer WhatsApp-Gruppe per Invite-Code bei.',
  async execute({ args, send, platformApi, m }) {
    const code = args[0];
    if (!code) return send({ chat: m?.chat, text: 'Bitte gib einen Invite-Code an.' });
    try {
      const response = await platformApi.groupAcceptInvite(code);
      return send({ chat: m?.chat, text: `Beigetreten zu: ${response}` });
    } catch (e) { return send({ chat: m?.chat, text: `Fehler: ${e.message}` }); }
  }
};
