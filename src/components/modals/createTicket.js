const { ChannelType, PermissionFlagsBits, MessageFlags } = require("discord.js");

const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");
const {
  ensureBotReadiness,
  ensureLogChannel,
  ensureTicketCategory,
  ensureTicketStaffRole,
  getGuildSettings,
  buildTicketActionRow,
  buildTicketCreatedEmbed,
  buildTicketOpenedLogEmbed,
  sanitizeChannelName,
} = require("../../utils/tickets");

module.exports = {
  customId: "ticket:create",
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await getGuildSettings(client, interaction.guildId);

    if (!settings) {
      await interaction.editReply({
        embeds: [createErrorEmbed(client, "The ticket system has not been configured yet.", "System Missing")],
      });
      return;
    }

    const readiness = await ensureBotReadiness(interaction.guild);

    if (!readiness.ok) {
      await interaction.editReply({
        embeds: [createErrorEmbed(client, readiness.reason, "Configuration Error")],
      });
      return;
    }

    const existingTicket = await client.database.getOpenTicketByUser(interaction.guildId, interaction.user.id);

    if (existingTicket) {
      const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

      if (existingChannel) {
        await interaction.editReply({
          embeds: [
            createErrorEmbed(
              client,
              `You already have an open ticket: ${existingChannel}. Close it before opening a new one.`,
              "Open Ticket Found"
            ),
          ],
        });
        return;
      }

      await client.database.markTicketAsDeleted(existingTicket._id);
    }

    const staffRole = await ensureTicketStaffRole({
      client,
      guild: interaction.guild,
      currentSettings: settings,
    });
    const category = await ensureTicketCategory({
      client,
      guild: interaction.guild,
      currentSettings: settings,
      staffRole,
    });
    const logChannel = await ensureLogChannel({
      client,
      guild: interaction.guild,
      currentSettings: settings,
      staffRole,
      category,
    });

    await client.database.saveGuildSettings(interaction.guildId, {
      panelTitle: settings.panelTitle,
      panelDescription: settings.panelDescription,
      panelFooter: settings.panelFooter,
      buttonLabel: settings.buttonLabel,
      panelColor: settings.panelColor,
      panelChannelId: settings.panelChannelId,
      panelMessageId: settings.panelMessageId,
      staffRoleId: staffRole.id,
      logChannelId: logChannel.id,
      categoryId: category.id,
    });

    const subject = interaction.fields.getTextInputValue("subject").trim();
    const description = interaction.fields.getTextInputValue("description").trim();
    const sequence = await client.database.getNextTicketSequence(interaction.guildId);
    const displayId = String(sequence).padStart(4, "0");
    const channelName = `ticket-${displayId}-${sanitizeChannelName(subject)}`.slice(0, 95);

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Ticket ${displayId} | Owner ${interaction.user.id}`,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: staffRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: interaction.guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    });

    let ticketData;

    try {
      ticketData = await client.database.createTicket({
        guildId: interaction.guildId,
        channelId: ticketChannel.id,
        categoryId: category.id,
        ownerId: interaction.user.id,
        subject,
        description,
        sequence,
        displayId,
        openedAt: new Date(),
        staffRoleId: staffRole.id,
        logChannelId: logChannel.id,
        status: "open",
      });
    } catch (error) {
      await ticketChannel.delete("Ticket sync rollback").catch(() => null);

      if (client.database.isDuplicateKeyError(error)) {
        await interaction.editReply({
          embeds: [
            createErrorEmbed(
              client,
              "You already have an open ticket. Close it before opening a new one.",
              "Open Ticket Found"
            ),
          ],
        });
        return;
      }

      throw error;
    }

    const createdEmbed = buildTicketCreatedEmbed(client, interaction.user, ticketData);
    await ticketChannel.send({
      content: `${interaction.user}`,
      embeds: [createdEmbed],
      components: [buildTicketActionRow(client)],
    });

    if (logChannel.isTextBased()) {
      const logEmbed = buildTicketOpenedLogEmbed(client, interaction.user, ticketData);
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }

    await interaction.editReply({
      embeds: [
        createSuccessEmbed(client, `Your ticket has been created: ${ticketChannel}`, "Ticket Created"),
      ],
    });
  },
};
