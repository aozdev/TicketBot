const { MessageFlags } = require("discord.js");

const { createErrorEmbed } = require("../../utils/embeds");

function findHandler(handlers, customId) {
  return handlers.find((handler) => {
    if (handler.customId && handler.customId === customId) {
      return true;
    }

    if (handler.customIdPrefix && customId.startsWith(handler.customIdPrefix)) {
      return true;
    }

    return false;
  });
}

function getHiddenReplyOptions(interaction) {
  return interaction.inGuild() ? { flags: MessageFlags.Ephemeral } : {};
}

async function replyWithUnexpectedError(interaction, client) {
  const payload = {
    embeds: [createErrorEmbed(client, "An unexpected error occurred while handling this interaction.")],
  };
  const hiddenReplyOptions = getHiddenReplyOptions(interaction);

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ ...payload, ...hiddenReplyOptions }).catch(() => null);
    return;
  }

  await interaction.reply({ ...payload, ...hiddenReplyOptions }).catch(() => null);
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return;
        }

        await command.execute(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        const handler = findHandler(client.buttonHandlers, interaction.customId);

        if (!handler) {
          return;
        }

        await handler.execute(interaction, client);
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = findHandler(client.modalHandlers, interaction.customId);

        if (!handler) {
          return;
        }

        await handler.execute(interaction, client);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const handler = findHandler(client.selectMenuHandlers, interaction.customId);

        if (!handler) {
          return;
        }

        await handler.execute(interaction, client);
      }
    } catch (error) {
      console.error("[InteractionCreate]", error);
      await replyWithUnexpectedError(interaction, client);
    }
  },
};
