require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { Client, GatewayIntentBits } = require('discord.js');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'replace-me';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in env!');
  process.exit(1);
}

// In-memory queue (replace with Redis/DB in production)
const queue = []; // array of events

function pushEvent(event) {
  event.id = event.id || uuidv4();
  event.timestamp = event.timestamp || Date.now();
  queue.push(event);
  console.log('Queued event:', event.type, event.id);
}

// --- Discord bot setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Example: command prefix "!roblox "
  if (message.content.startsWith('!sendab ')) {
    const content = message.content.slice('!roblox '.length).trim();
    const payload = {
      type: 'discord_message',
      author: message.author.tag,
      authorId: message.author.id,
      content: content,
      channelId: message.channel.id
    };
    pushEvent(payload);
    try { await message.reply('Sent to Roblox.'); } catch(e){ console.warn('Reply failed:', e); }
  }

  // Example: simple forward on "forward" without a prefix (customize as needed)
  // if (message.content.toLowerCase() === 'forward this') { ... }
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Failed to login Discord:', err);
  process.exit(1);
});

// --- Express API ---
const app = express();
app.use(bodyParser.json());

// Health
app.get('/', (req, res) => res.json({ ok: true, queued: queue.length }));

// Push event (external service can post here)
app.post('/push', (req, res) => {
  const key = req.header('x-api-key');
  if (key !== API_KEY) return res.status(403).json({ error: 'forbidden' });
  const item = req.body;
  if (!item || !item.type) return res.status(400).json({ error: 'missing event body' });
  pushEvent(item);
  return res.json({ ok: true, id: item.id });
});

// Roblox polls this endpoint to get new events (and remove them from queue)
app.get('/getEvents', (req, res) => {
  const key = req.header('x-api-key');
  if (key !== API_KEY) return res.status(403).json({ error: 'forbidden' });

  const limit = mathClamp(parseInt(req.query.limit) || 50, 1, 200);
  const items = queue.splice(0, limit);
  return res.json({ events: items });
});

// Admin: check queue size (protected)
app.get('/status', (req, res) => {
  const key = req.header('x-api-key');
  if (key !== API_KEY) return res.status(403).json({ error: 'forbidden' });
  res.json({ queued: queue.length });
});

function mathClamp(v, a, b){ if(isNaN(v)) return a; return Math.max(a, Math.min(b, v)); }

app.listen(PORT, () => {
  console.log(`Express API listening on port ${PORT}`);
});
