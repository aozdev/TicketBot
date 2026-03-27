const { PermissionsBitField, MessageFlags } = require("discord.js");

const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");
const { createTranscriptAttachment, getGuildSettings, getTicketByChannelId } = require("../../utils/tickets");

module.exports = {
  customId: "ticket:transcript",
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const ticket = await getTicketByChannelId(client, interaction.channelId);

    if (!ticket) {
      await interaction.editReply({
        embeds: [createErrorEmbed(client, "This channel is not registered as an open ticket.", "Ticket Missing")],
      });
      return;
    }

    const settings = await getGuildSettings(client, interaction.guildId);
    const isTicketOwner = interaction.user.id === ticket.ownerId;
    const isTicketStaff =
      interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
      interaction.member.roles.cache.has(settings?.staffRoleId);

    if (!isTicketOwner && !isTicketStaff) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            client,
            "Only the ticket opener, the configured staff role, or members with Manage Messages can generate a transcript.",
            "Access Denied"
          ),
        ],
      });
      return;
    }

    try {
      const transcriptAttachment = await createTranscriptAttachment(interaction.channel, ticket, interaction.user);

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            client,
            `The conversation transcript for ticket ${ticket.displayId} is ready.`,
            "Transcript Generated"
          ),
        ],
        files: [transcriptAttachment],
      });
    } catch (error) {
      console.error("[Transcript] Error:", error);
      await interaction.editReply({
        embeds: [createErrorEmbed(client, "The transcript could not be generated for this ticket.", "Transcript Failed")],
      });
    }
  },
};
