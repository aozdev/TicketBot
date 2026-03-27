const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  customId: "ticket:open",
  async execute(interaction) {
    const modal = new ModalBuilder().setCustomId("ticket:create").setTitle("Create Ticket");
    const subjectInput = new TextInputBuilder()
      .setCustomId("subject")
      .setLabel("Title")
      .setPlaceholder("Briefly describe your request")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(5)
      .setMaxLength(100);
    const descriptionInput = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Description")
      .setPlaceholder("Explain the issue or request in detail")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(20)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(subjectInput),
      new ActionRowBuilder().addComponents(descriptionInput)
    );

    await interaction.showModal(modal);
  },
};
