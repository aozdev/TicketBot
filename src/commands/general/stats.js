const os = require("node:os");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");

const { createInfoEmbed } = require("../../utils/embeds");

const GITHUB_REPOSITORY_URL = "https://github.com/aozdev/TicketBot";

function formatMemoryUsage(usedMb, totalMb) {
  return `${usedMb.toFixed(2)} MB / ${totalMb.toFixed(2)} MB`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View runtime and usage statistics for the bot."),
  async execute(interaction, client) {
    await interaction.deferReply();

    const totalUsers = client.guilds.cache.reduce((sum, guild) => sum + guild.memberCount, 0);
    const [openTickets, solvedTickets] = await Promise.all([
      client.database.countOpenTicketsByGuild(interaction.guildId),
      client.database.countSolvedTicketsByGuild(interaction.guildId),
    ]);

    const startedAtUnix = Math.floor((Date.now() - process.uptime() * 1000) / 1000);
    const memoryUsageMb = process.memoryUsage().rss / 1024 / 1024;
    const totalSystemMemoryMb = os.totalmem() / 1024 / 1024;
    const cpuModel = os.cpus()[0]?.model ?? "Unknown CPU";
    const cpuCores = os.cpus().length;

    const embed = createInfoEmbed(client, "Current runtime and system information.", "Bot Statistics").addFields(
      {
        name: "General",
        value: [
          `Guilds: ${client.guilds.cache.size}`,
          `Users: ${totalUsers}`,
          `Current Guild Open Tickets: ${openTickets}`,
          `Solved Tickets: ${solvedTickets}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Latency",
        value: [
          `Gateway Ping: ${client.ws.ping} ms`,
          `Round Trip: ${Date.now() - interaction.createdTimestamp} ms`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Runtime",
        value: [
          `Started: <t:${startedAtUnix}:F>`,
          `Uptime: <t:${startedAtUnix}:R>`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "System",
        value: [
          `CPU: ${cpuModel}`,
          `CPU Cores: ${cpuCores}`,
          `RAM: ${formatMemoryUsage(memoryUsageMb, totalSystemMemoryMb)}`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "Versions",
        value: [
          `Node.js: ${process.version}`,
          `discord.js: ${require("discord.js").version}`,
          `Mongoose: ${require("mongoose").version}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Developer",
        value: `ID: ${client.config.developerId}`,
        inline: true,
      }
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("View on GitHub")
        .setStyle(ButtonStyle.Link)
        .setURL(GITHUB_REPOSITORY_URL)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [actionRow],
    });
  },
};

