const { ChannelType, PermissionsBitField, SlashCommandBuilder, MessageFlags } = require("discord.js");

const { createErrorEmbed, createInfoEmbed, createSuccessEmbed } = require("../../utils/embeds");
const { configureTicketSystem, getGuildSettings } = require("../../utils/tickets");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("View or edit the existing ticket panel settings.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .setDMPermission(false)
    .addStringOption((option) =>
      option.setName("title").setDescription("New panel embed title").setMaxLength(256)
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("New panel embed description").setMaxLength(4000)
    )
    .addStringOption((option) =>
      option.setName("footer").setDescription("New panel embed footer text").setMaxLength(2048)
    )
    .addStringOption((option) =>
      option
        .setName("panel-color")
        .setDescription("New panel embed color in hex, for example #1F2937")
        .setMaxLength(7)
    )
    .addStringOption((option) =>
      option.setName("button-text").setDescription("New button label").setMaxLength(80)
    )
    .addRoleOption((option) =>
      option.setName("staff-role").setDescription("Replace the current staff role")
    )
    .addStringOption((option) =>
      option
        .setName("staff-role-id")
        .setDescription("Replace the current staff role with a pasted role ID")
        .setMaxLength(30)
    )
    .addChannelOption((option) =>
      option
        .setName("ticket-log")
        .setDescription("Replace the log channel")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((option) =>
      option
        .setName("panel-channel")
        .setDescription("Move the panel message into another text channel")
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const currentSettings = await getGuildSettings(client, interaction.guildId);

    if (!currentSettings) {
      const embed = createErrorEmbed(
        client,
        "No ticket system has been configured for this server yet. Run /setup-ticket first.",
        "Settings Not Found"
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const updates = {
      title: interaction.options.getString("title"),
      message: interaction.options.getString("message"),
      footer: interaction.options.getString("footer"),
      panelColor: interaction.options.getString("panel-color"),
      buttonText: interaction.options.getString("button-text"),
      staffRole: interaction.options.getRole("staff-role"),
      staffRoleId: interaction.options.getString("staff-role-id"),
      ticketLog: interaction.options.getChannel("ticket-log"),
    };
    const requestedPanelChannel = interaction.options.getChannel("panel-channel");
    const hasUpdates = Object.values(updates).some(Boolean) || Boolean(requestedPanelChannel);

    if (!hasUpdates) {
      const summaryEmbed = createInfoEmbed(
        client,
        [
          `Panel channel: <#${currentSettings.panelChannelId}>`,
          `Panel message ID: ${currentSettings.panelMessageId}`,
          `Staff role: <@&${currentSettings.staffRoleId}>`,
          `Log channel: <#${currentSettings.logChannelId}>`,
          `Category ID: ${currentSettings.categoryId}`,
          `Panel color: ${currentSettings.panelColor ?? client.config.ticket.panelColor ?? client.config.embedColors.primary}`,
          `Panel title: ${currentSettings.panelTitle}`,
          `Button label: ${currentSettings.buttonLabel}`,
        ].join("\n"),
        "Current Ticket Settings"
      );

      await interaction.editReply({ embeds: [summaryEmbed] });
      return;
    }

    try {
      const result = await configureTicketSystem({
        client,
        guild: interaction.guild,
        currentSettings,
        fallbackPanelChannel: requestedPanelChannel ?? interaction.channel,
        options: updates,
      });

      const successEmbed = createSuccessEmbed(
        client,
        [
          `Ticket panel synced in ${result.panelChannel}.`,
          `Staff role: <@&${result.staffRole.id}>`,
          `Log channel: ${result.logChannel}`,
          `Panel color: ${result.settings.panelColor}`,
          `Panel message ID: ${result.panelMessage.id}`,
        ].join("\n"),
        "Settings Updated"
      );

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      const failureEmbed = createErrorEmbed(client, error.message, "Update Failed");
      await interaction.editReply({ embeds: [failureEmbed] });
    }
  },
};
