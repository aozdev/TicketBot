import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const commands = [
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Modern ticket management commands')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new private support ticket')
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Reason for opening the ticket')
            .setMaxLength(200),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close the current ticket channel')
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Reason for closing the ticket')
            .setMaxLength(200),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a user to the current ticket')
        .addUserOption((option) => option.setName('user').setDescription('User to add').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the current ticket')
        .addUserOption((option) => option.setName('user').setDescription('User to remove').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Rename the current ticket channel')
        .addStringOption((option) =>
          option.setName('name').setDescription('New ticket channel name').setRequired(true).setMaxLength(90),
        ),
    )
    .addSubcommand((sub) => sub.setName('claim').setDescription('Claim the current ticket as staff'))
    .addSubcommand((sub) => sub.setName('info').setDescription('Show information about the current ticket'))
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands },
);

console.log('Slash commands have been registered successfully.');
