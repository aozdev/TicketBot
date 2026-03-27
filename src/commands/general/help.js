const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the help menu and available commands."),
  async execute(interaction, client) {
    const userAvatarUrl = interaction.user.displayAvatarURL({ size: 256 });
    const botAvatarUrl = client.user.displayAvatarURL({ size: 256 });
    const currentDate = new Date();
    const formattedDate = `${String(currentDate.getDate()).padStart(2, "0")}.${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

    const embed = new EmbedBuilder()
      .setColor(client.config.embedColors.primary)
      .setAuthor({
        name: "You are currently viewing the help menu",
        iconURL: userAvatarUrl,
      })
      .setDescription("Bot prefix: **/**\nYou can review the bot commands in the list below.")
      .addFields(
        {
          name: "General",
          value: "`/ping` `/stats` `/help`",
          inline: false,
        },
        {
          name: "Ticket",
          value: "`/setup-ticket` `/settings` `/reset`",
          inline: false,
        }
      )
      .setThumbnail(botAvatarUrl)
      .setFooter({ text: `${client.user.username} | ${formattedDate}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

