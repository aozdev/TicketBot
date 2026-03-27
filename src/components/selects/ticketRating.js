const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");
const { buildTicketRatingLogEmbed, formatRatingStars } = require("../../utils/tickets");

module.exports = {
  customIdPrefix: "ticket:rating:",
  async execute(interaction, client) {
    const ticketDocumentId = interaction.customId.split(":").pop();
    const rating = Number(interaction.values[0]);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      await interaction.update({
        embeds: [createErrorEmbed(client, "This rating request is no longer valid.", "Rating Expired")],
        components: [],
      });
      return;
    }

    const ticket = await client.database.getClosedTicketById(ticketDocumentId);

    if (!ticket) {
      await interaction.update({
        embeds: [createErrorEmbed(client, "This rating request is no longer valid.", "Rating Expired")],
        components: [],
      });
      return;
    }

    if (interaction.user.id !== ticket.ownerId) {
      await interaction.reply({
        embeds: [createErrorEmbed(client, "Only the original ticket opener can submit this rating.", "Access Denied")],
      });
      return;
    }

    if (ticket.rating) {
      await interaction.update({
        embeds: [
          createSuccessEmbed(
            client,
            `This ticket was already rated ${formatRatingStars(ticket.rating)} (${ticket.rating}/5).`,
            "Rating Received"
          ),
        ],
        components: [],
      });
      return;
    }

    if (rating <= 2) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket:rating-feedback:${ticketDocumentId}:${rating}`)
        .setTitle("Tell Us More");
      const feedbackInput = new TextInputBuilder()
        .setCustomId("rating-feedback")
        .setLabel("Why did you give this rating?")
        .setPlaceholder("Please explain what could have been better")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);

      modal.addComponents(new ActionRowBuilder().addComponents(feedbackInput));
      await interaction.showModal(modal);
      return;
    }

    const ratedTicket = await client.database.saveTicketRating(ticketDocumentId, interaction.user.id, rating);

    if (!ratedTicket) {
      await interaction.update({
        embeds: [createErrorEmbed(client, "This rating request is no longer valid.", "Rating Expired")],
        components: [],
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

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          client,
          `Thanks for rating your ticket ${formatRatingStars(rating)} (${rating}/5).`,
          "Rating Received"
        ),
      ],
      components: [],
    });
  },
};
