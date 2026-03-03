import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Eksik ortam degiskenleri: ${missing.join(', ')}`);
}

const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Özelleştirilebilir ticket panelini gönderir')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands },
);

console.log('Slash komutları başarıyla kaydedildi.');
