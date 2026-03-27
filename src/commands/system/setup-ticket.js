const { ChannelType, PermissionsBitField, SlashCommandBuilder, MessageFlags } = require("discord.js");

const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");
const { configureTicketSystem, getGuildSettings } = require("../../utils/tickets");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-ticket")
    .setDescription("Create the ticket panel and configure the ticket system.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .setDMPermission(false)
    .addStringOption((option) =>
      option.setName("title").setDescription("Panel embed title").setMaxLength(256)
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("Panel embed description").setMaxLength(4000)
    )
    .addStringOption((option) =>
      option.setName("footer").setDescription("Panel embed footer text").setMaxLength(2048)
    )
    .addStringOption((option) =>
      option
        .setName("panel-color")
        .setDescription("Panel embed color in hex, for example #1F2937")
        .setMaxLength(7)
    )
    .addStringOption((option) =>
      option.setName("button-text").setDescription("Button label").setMaxLength(80)
    )
    .addRoleOption((option) =>
      option.setName("staff-role").setDescription("Existing staff role for ticket access")
    )
    .addStringOption((option) =>
      option
        .setName("staff-role-id")
        .setDescription("Existing staff role ID if you prefer pasting it manually")
        .setMaxLength(30)
    )
    .addChannelOption((option) =>
      option
        .setName("ticket-log")
        .setDescription("Text channel used for ticket logs")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((option) =>
      option
        .setName("panel-channel")
        .setDescription("Text channel where the panel message should be posted")
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const currentSettings = (await getGuildSettings(client, interaction.guildId)) ?? {};

    try {
      const panelChannel = interaction.options.getChannel("panel-channel") ?? interaction.channel;
      const result = await configureTicketSystem({
        client,
        guild: interaction.guild,
        currentSettings,
        fallbackPanelChannel: panelChannel,
        options: {
          title: interaction.options.getString("title"),
          message: interaction.options.getString("message"),
          footer: interaction.options.getString("footer"),
          panelColor: interaction.options.getString("panel-color"),
          buttonText: interaction.options.getString("button-text"),
          staffRole: interaction.options.getRole("staff-role"),
          staffRoleId: interaction.options.getString("staff-role-id"),
          ticketLog: interaction.options.getChannel("ticket-log"),
        },
      });

      const successEmbed = createSuccessEmbed(
        client,
        [
          `Ticket panel updated in ${result.panelChannel}.`,
          `Staff role: <@&${result.staffRole.id}>`,
          `Log channel: ${result.logChannel}`,
          `Panel color: ${result.settings.panelColor}`,
          `Panel message ID: ${result.panelMessage.id}`,
        ].join("\n"),
        "Ticket System Ready"
      );

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      const failureEmbed = createErrorEmbed(client, error.message, "Setup Failed");
      await interaction.editReply({ embeds: [failureEmbed] });
    }
  },
};
