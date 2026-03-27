const { MessageFlags } = require("discord.js");

const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");
const { buildTicketRatingLogEmbed, formatRatingStars } = require("../../utils/tickets");

function getHiddenReplyOptions(interaction) {
  return interaction.inGuild() ? { flags: MessageFlags.Ephemeral } : {};
}

module.exports = {
  customIdPrefix: "ticket:rating-feedback:",
  async execute(interaction, client) {
    const payload = interaction.customId.slice("ticket:rating-feedback:".length);
    const [ticketDocumentId, ratingValue] = payload.split(":");
    const rating = Number(ratingValue);
    const hiddenReplyOptions = getHiddenReplyOptions(interaction);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      await interaction.reply({
        embeds: [createErrorEmbed(client, "This rating request is no longer valid.", "Rating Expired")],
        ...hiddenReplyOptions,
      });
      return;
    }

    const ticket = await client.database.getClosedTicketById(ticketDocumentId);

    if (!ticket) {
      await interaction.reply({
        embeds: [createErrorEmbed(client, "This rating request is no longer valid.", "Rating Expired")],
        ...hiddenReplyOptions,
      });
      return;
    }

    if (interaction.user.id !== ticket.ownerId) {
      await interaction.reply({
        embeds: [createErrorEmbed(client, "Only the original ticket opener can submit this rating.", "Access Denied")],
        ...hiddenReplyOptions,
      });
      return;
    }

    if (ticket.rating) {
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            client,
            `This ticket was already rated ${formatRatingStars(ticket.rating)} (${ticket.rating}/5).`,
            "Rating Received"
          ),
        ],
        ...hiddenReplyOptions,
      });
      return;
    }

    const feedback = interaction.fields.getTextInputValue("rating-feedback").trim();
    const ratedTicket = await client.database.saveTicketRating(ticketDocumentId, interaction.user.id, rating, feedback);

    if (!ratedTicket) {
      await interaction.reply({
        embeds: [createErrorEmbed(client, "This rating request is no longer valid.", "Rating Expired")],
        ...hiddenReplyOptions,
      });
      return;
    }

    if (ratedTicket.logChannelId) {
      const logChannel = await client.channels.fetch(ratedTicket.logChannelId).catch(() => null);

      if (logChannel?.isTextBased()) {
        const ratingEmbed = buildTicketRatingLogEmbed(client, ratedTicket, interaction.user, rating);
        await logChannel.send({ embeds: [ratingEmbed] }).catch(() => null);
      }
    }

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          client,
          `Thanks for rating your ticket ${formatRatingStars(rating)} (${rating}/5). Your feedback was saved.`,
          "Rating Received"
        ),
      ],
      ...hiddenReplyOptions,
    });
  },
};
