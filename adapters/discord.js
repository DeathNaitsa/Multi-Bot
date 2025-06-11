// File: adapters/discord.js
// CommonJS‐Modul für Discord, kompatibel mit index.js

const fs = require('fs');
const path = require('path');
const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Collection,
  ChannelType,
  ChatInputCommandInteraction
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// ‼️ In der Praxis solltest du diese sensiblen Daten NIE hartkodiert lassen,
//    sondern z.B. über process.env (dotenv) einlesen.
const BOT_TOKEN = 'DEIN_TOKEN_HIER';
const CLIENT_ID = 'DEIN_CLIENTID_HIER';
const GUILD_ID  = 'DEIN_GUILD_ID_HIER';

module.exports = function (handleIncoming) {
  if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('❌ Discord: Bitte Umgebungsvariablen DISCORD_TOKEN, DISCORD_CLIENT_ID und DISCORD_GUILD_ID setzen!');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates, // <--- DAS MUSS DAZU!

      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Channel
    ],
  });

  // Slash-Commands laden (wie gehabt)
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.existsSync(commandsPath)
    ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
    : [];
  const slashCommands = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const cmd = require(filePath);
    if (!cmd.name || !cmd.description) continue;
    client.commands.set(cmd.name, cmd);
    slashCommands.push({
      name: cmd.name,
      description: cmd.description,
      options: cmd.options || []
    });
  }

  (async () => {
    try {
      const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
      await rest.put(
        Routes.applicationCommands(CLIENT_ID, GUILD_ID),
        { body: slashCommands }
      );
      console.log('✅ Discord: Guild‐Commands registriert.');
    } catch (err) {
      console.error('❌ Discord: Fehler beim Registrieren der Guild‐Commands:', err);
    }
  })();

  client.once(Events.ClientReady, () => {
    console.log(`🤖 Discord‐Bot ${client.user.tag} ist online!`);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({ content: `Unbekannter Befehl: ${interaction.commandName}`, ephemeral: true });
      }
      try {
        await command.execute({
          interaction,
          args: interaction.options,
        });
      } catch (err) {
        console.error(`❌ Fehler beim Ausführen von "${interaction.commandName}":`, err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Fehler beim Ausführen des Befehls.', ephemeral: true });
        }
      }
      return;
    }
    if (interaction.isButton()) {
      if (interaction.customId === 'confirm') {
        return interaction.reply({ content: 'Aktion bestätigt!', ephemeral: true });
      }
      return;
    }
    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(true);
      if (focused.name === 'text') {
        const choices = ['Option A', 'Option B', 'Beispieltext'];
        const filtered = choices.filter(choice => choice.startsWith(focused.value));
        await interaction.respond(
          filtered.map(choice => ({ name: choice, value: choice }))
        );
      }
      return;
    }
  });

  // EINZIGER Nachrichten‐Handler, der JEDERZEIT **alle** Textnachrichten empfängt, loggt und weiterleitet
  client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const isDM = message.channel.type === ChannelType.DM;

    // Bild extrahieren (falls vorhanden)
    let image = null;
    if (message.attachments && message.attachments.size > 0) {
      const img = message.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
      if (img) image = img.url;
    }

    // Video extrahieren (falls vorhanden)
    let video = null;
    if (message.attachments && message.attachments.size > 0) {
      const vid = message.attachments.find(a => a.contentType && a.contentType.startsWith('video/'));
      if (vid) video = vid.url;
    }

    // Plattformunabhängiges mIncoming-Objekt
    const m = {
      platform: 'discord',
      sender: message.author.id,
      chat: isDM ? message.author.id : message.channel.id,
      text: message.content,
      msgRaw: message,
      image,
        guildId: message?.guild?.id,
      video
    };

    // send-Funktion wie gehabt
    const send = async ({ chat, text, image, video }) => {
      try {
        const channelId = chat || m.chat;
        if (!channelId) {
          console.error('Discord: send() erhielt keine gültige chat‐ID.');
          return;
        }
        let target;
        if (isDM && channelId === m.chat) {
          const user = await client.users.fetch(channelId);
          target = await user.createDM();
        } else {
          target = await client.channels.fetch(channelId);
        }
        if (!target || typeof target.send !== 'function') {
          console.error('Discord: Ziel ist kein send‐fähiger Channel/Dm:', channelId);
          return;
        }
        const files = [];
        if (image) files.push(image);
        if (video) files.push(video);
        await target.send({ content: text, files: files.length ? files : undefined });
      } catch (e) {
        console.error('Discord: Fehler beim Senden:', e);
      }
    };

    handleIncoming(m, send);
  });

  client.login(BOT_TOKEN);

  return client;
};