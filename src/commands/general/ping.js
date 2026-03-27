const { SlashCommandBuilder } = require("discord.js");

const { createInfoEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot latency and API heartbeat."),
  async execute(interaction, client) {
    const embed = createInfoEmbed(
      client,
      `Gateway latency: ${client.ws.ping}ms\nRound-trip time: ${Date.now() - interaction.createdTimestamp}ms`,
      "Ping"
    );

    await interaction.reply({ embeds: [embed] });
  },
};
