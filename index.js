require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('messageCreate', msg => {
  if (msg.author.bot) return;
  if (msg.content.toLowerCase() === 'ping') msg.reply('pong');
});

client.login(process.env.DISCORD_TOKEN);
