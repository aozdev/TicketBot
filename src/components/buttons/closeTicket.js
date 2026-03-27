const { PermissionsBitField, MessageFlags } = require("discord.js");

const { createErrorEmbed, createInfoEmbed, createSuccessEmbed } = require("../../utils/embeds");
const {
  createTranscriptAttachment,
  getGuildSettings,
  getTicketByChannelId,
  buildTicketRatingPrompt,
  buildTicketClosureLogEmbed,
  getDeleteDelayMs,
} = require("../../utils/tickets");
const { updateSolvedPresence } = require("../../utils/presence");

module.exports = {
  customId: "ticket:close",
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
            "Only the ticket opener, the configured staff role, or members with Manage Messages can close tickets.",
            "Access Denied"
          ),
        ],
      });
      return;
    }

    const deleteDelaySeconds = Math.floor(getDeleteDelayMs(client) / 1000);
    const logChannel = settings?.logChannelId ? interaction.guild.channels.cache.get(settings.logChannelId) : null;
    const closedTicket = await client.database.closeTicketByChannel(
      interaction.channelId,
      interaction.user.id,
      logChannel?.id ?? null
    );

    if (!closedTicket) {
      await interaction.editReply({
        embeds: [createErrorEmbed(client, "This ticket is already closed or no longer available.", "Ticket Missing")],
      });
      return;
    }

    const owner = await client.users.fetch(closedTicket.ownerId).catch(() => null);
    let ratingPromptSent = false;
    let transcriptAttachment = null;
    let transcriptStatus = "Failed";

    try {
      transcriptAttachment = await createTranscriptAttachment(interaction.channel, closedTicket, interaction.user);
      transcriptStatus = "Attached";
    } catch (error) {
      console.error("[Transcript] Error:", error);
    }

    if (owner) {
      const ratingPrompt = buildTicketRatingPrompt(client, closedTicket);
      ratingPromptSent = await owner.send(ratingPrompt).then(() => true).catch(() => false);
    }

    if (logChannel?.isTextBased()) {
      const logEmbed = buildTicketClosureLogEmbed(
        client,
        closedTicket,
        interaction.user,
        ratingPromptSent,
        transcriptStatus
      );
      await logChannel
        .send({
          embeds: [logEmbed],
          files: transcriptAttachment ? [transcriptAttachment] : [],
        })
        .catch(() => null);
    }

    await updateSolvedPresence(client);

    await interaction.channel.send({
      embeds: [
        createInfoEmbed(
          client,
          `This ticket has been closed by ${interaction.user}. The channel will be deleted in ${deleteDelaySeconds} seconds.`,
          "Ticket Closed"
        ),
      ],
      components: [],
    });

    await interaction.editReply({
      embeds: [createSuccessEmbed(client, "The ticket has been closed and the rating request has been processed.")],
    });

    setTimeout(async () => {
      await interaction.channel.delete("Ticket closed").catch(() => null);
    }, getDeleteDelayMs(client));
  },
};
