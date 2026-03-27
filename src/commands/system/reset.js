const { PermissionsBitField, SlashCommandBuilder, MessageFlags } = require("discord.js");

const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");
const { deleteStoredPanelMessage, getGuildSettings } = require("../../utils/tickets");
const { updateSolvedPresence } = require("../../utils/presence");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset the entire ticket system and clear all ticket data.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .setDMPermission(false),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await getGuildSettings(client, interaction.guildId);
    const ticketDocuments = await client.database.listTicketsByGuild(interaction.guildId);

    const managedChannelIds = new Set(
      ticketDocuments
        .map((ticket) => ticket.channelId)
        .filter(Boolean)
    );

    if (settings?.logChannelId) {
      managedChannelIds.add(settings.logChannelId);
    }

    if (managedChannelIds.has(interaction.channelId)) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            client,
            "Run /reset from a normal admin channel, not from a managed ticket or log channel.",
            "Unsafe Reset Location"
          ),
        ],
      });
      return;
    }

    if (settings) {
      await deleteStoredPanelMessage(interaction.guild, settings);
    }

    let deletedChannels = 0;
    let deletedCategory = false;
    let deletedRole = false;

    const category = settings?.categoryId ? interaction.guild.channels.cache.get(settings.categoryId) : null;
    const channelsToDelete = new Set(managedChannelIds);

    if (category?.children?.cache?.size) {
      for (const child of category.children.cache.values()) {
        channelsToDelete.add(child.id);
      }
    }

    for (const channelId of channelsToDelete) {
      if (channelId === interaction.channelId) {
        continue;
      }

      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        continue;
      }

      const deleted = await channel.delete("Ticket system reset").then(() => true).catch(() => false);

      if (deleted) {
        deletedChannels += 1;
      }
    }

    if (category) {
      deletedCategory = await category.delete("Ticket system reset").then(() => true).catch(() => false);
    }

    const staffRole = settings?.staffRoleId ? interaction.guild.roles.cache.get(settings.staffRoleId) : null;

    if (staffRole) {
      deletedRole = await staffRole.delete("Ticket system reset").then(() => true).catch(() => false);
    }

    const resetResult = await client.database.resetGuildData(interaction.guildId);
    await updateSolvedPresence(client);

    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          client,
          [
            "The ticket system has been fully reset.",
            `Deleted channels: ${deletedChannels}`,
            `Deleted category: ${deletedCategory ? "Yes" : "No"}`,
            `Deleted staff role: ${deletedRole ? "Yes" : "No"}`,
            `Deleted ticket documents: ${resetResult.deletedTicketDocuments}`,
            "Ticket numbering has been reset to zero.",
          ].join("\n"),
          "System Reset Complete"
        ),
      ],
    });
  },
};
