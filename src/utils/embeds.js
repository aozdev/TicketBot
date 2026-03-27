const { EmbedBuilder } = require("discord.js");

function createBaseEmbed(client, title, description, color) {
  const embed = new EmbedBuilder()
    .setColor(color ?? client.config.embedColors.primary)
    .setTimestamp();

  if (title) {
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

function createInfoEmbed(client, description, title = "Information") {
  return createBaseEmbed(client, title, description, client.config.embedColors.primary);
}

function createSuccessEmbed(client, description, title = "Success") {
  return createBaseEmbed(client, title, description, client.config.embedColors.success);
}

function createErrorEmbed(client, description, title = "Error") {
  return createBaseEmbed(client, title, description, client.config.embedColors.error);
}

function createWarningEmbed(client, description, title = "Warning") {
  return createBaseEmbed(client, title, description, client.config.embedColors.warning);
}

module.exports = {
  createBaseEmbed,
  createInfoEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
};
