const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require("discord.js");

const STAR = "\u2B50";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getTicketDefaults(client) {
  return {
    panelColor: client.config.ticket.panelColor ?? client.config.embedColors.primary,
    panelTitle: client.config.ticket.panelTitle,
    panelDescription: client.config.ticket.panelDescription,
    panelFooter: client.config.ticket.panelFooter,
    buttonLabel: client.config.ticket.buttonLabel,
  };
}

function normalizeHexColor(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue.startsWith("#") ? trimmedValue.slice(1) : trimmedValue;

  if (!/^[\dA-Fa-f]{6}$/.test(normalizedValue)) {
    throw new Error("Panel color must be a valid 6-digit hex color, for example #1F2937.");
  }

  return `#${normalizedValue.toUpperCase()}`;
}

function getDeleteDelayMs(client) {
  return Math.max(5, Number(client.config.ticket.deleteDelaySeconds) || 10) * 1000;
}

async function getGuildSettings(client, guildId) {
  return client.database.getGuildSettings(guildId);
}

async function getTicketByChannelId(client, channelId) {
  return client.database.getOpenTicketByChannel(channelId);
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatTranscriptTimestamp(timestamp) {
  const date = new Date(timestamp);
  const dayName = DAY_NAMES[date.getDay()] ?? "Unknown";

  return `${padNumber(date.getDate())}.${padNumber(date.getMonth() + 1)}.${date.getFullYear()} ${padNumber(
    date.getHours()
  )}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())} ${dayName}`;
}

function buildCategoryPermissionOverwrites(guild, staffRoleId) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];
}

function buildLogChannelPermissionOverwrites(guild, staffRoleId) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];
}

function formatRatingStars(rating) {
  return STAR.repeat(Math.max(0, Number(rating) || 0));
}

async function ensureBotReadiness(guild) {
  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  const requiredPermissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ];
  const missingPermissions = botMember.permissions.missing(requiredPermissions);

  if (missingPermissions.length > 0) {
    return {
      ok: false,
      reason: `The bot is missing required permissions: ${missingPermissions.join(", ")}.`,
    };
  }

  if (botMember.roles.highest.position < guild.roles.highest.position) {
    return {
      ok: false,
      reason: "Move the bot role to the top of the role list before using the ticket system.",
    };
  }

  return { ok: true, botMember };
}

async function ensureTicketStaffRole({ client, guild, currentSettings, providedRole, providedRoleId }) {
  if (providedRole) {
    return providedRole;
  }

  if (providedRoleId) {
    const roleFromId = guild.roles.cache.get(providedRoleId);

    if (roleFromId) {
      return roleFromId;
    }
  }

  if (currentSettings?.staffRoleId) {
    const savedRole = guild.roles.cache.get(currentSettings.staffRoleId);

    if (savedRole) {
      return savedRole;
    }
  }

  return guild.roles.create({
    name: client.config.ticket.staffRoleName,
    reason: "Ticket system requires a staff role.",
    mentionable: true,
  });
}

async function ensureTicketCategory({ client, guild, currentSettings, staffRole }) {
  const permissionOverwrites = buildCategoryPermissionOverwrites(guild, staffRole.id);

  if (currentSettings?.categoryId) {
    const savedCategory = guild.channels.cache.get(currentSettings.categoryId);

    if (savedCategory?.type === ChannelType.GuildCategory) {
      await savedCategory.edit({ permissionOverwrites }).catch(() => null);
      return savedCategory;
    }
  }

  return guild.channels.create({
    name: client.config.ticket.categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: "Ticket system requires a ticket category.",
  });
}

async function ensureLogChannel({ client, guild, currentSettings, staffRole, category, providedChannel }) {
  const permissionOverwrites = buildLogChannelPermissionOverwrites(guild, staffRole.id);
  const syncExistingChannel = async (channel) => {
    await channel.edit({
      parent: category.id,
      permissionOverwrites,
    });

    return channel;
  };

  if (providedChannel?.type === ChannelType.GuildText) {
    return syncExistingChannel(providedChannel);
  }

  if (currentSettings?.logChannelId) {
    const savedChannel = guild.channels.cache.get(currentSettings.logChannelId);

    if (savedChannel?.type === ChannelType.GuildText) {
      return syncExistingChannel(savedChannel);
    }
  }

  return guild.channels.create({
    name: client.config.ticket.logChannelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
    reason: "Ticket system requires a log channel.",
  });
}

function buildTicketPanelEmbed(client, settings) {
  return new EmbedBuilder()
    .setColor(settings.panelColor ?? client.config.ticket.panelColor ?? client.config.embedColors.primary)
    .setTitle(settings.panelTitle)
    .setDescription(settings.panelDescription)
    .setFooter({ text: settings.panelFooter })
    .setTimestamp();
}

function buildPanelActionRow(client, buttonLabel) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:open")
      .setLabel(buttonLabel || client.config.ticket.buttonLabel)
      .setStyle(ButtonStyle.Primary)
  );
}

function buildTicketActionRow(client) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:transcript")
      .setLabel("Conversation Transcript")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel(client.config.ticket.closeButtonLabel)
      .setStyle(ButtonStyle.Danger)
  );
}

async function fetchStoredPanelMessage(guild, currentSettings) {
  if (!currentSettings?.panelChannelId || !currentSettings?.panelMessageId) {
    return null;
  }

  const existingChannel = guild.channels.cache.get(currentSettings.panelChannelId);

  if (!existingChannel?.isTextBased()) {
    return null;
  }

  return existingChannel.messages.fetch(currentSettings.panelMessageId).catch(() => null);
}

async function deleteStoredPanelMessage(guild, currentSettings) {
  const message = await fetchStoredPanelMessage(guild, currentSettings);

  if (message) {
    await message.delete().catch(() => null);
  }
}

async function upsertPanelMessage({ client, guild, currentSettings, nextSettings, panelChannel }) {
  const previousMessage = await fetchStoredPanelMessage(guild, currentSettings);
  const payload = {
    embeds: [buildTicketPanelEmbed(client, nextSettings)],
    components: [buildPanelActionRow(client, nextSettings.buttonLabel)],
  };

  if (previousMessage && previousMessage.channelId === panelChannel.id) {
    await previousMessage.edit(payload);
    return previousMessage;
  }

  if (previousMessage) {
    await previousMessage.delete().catch(() => null);
  }

  return panelChannel.send(payload);
}

async function configureTicketSystem({ client, guild, currentSettings, fallbackPanelChannel, options }) {
  const readiness = await ensureBotReadiness(guild);

  if (!readiness.ok) {
    throw new Error(readiness.reason);
  }

  if (fallbackPanelChannel?.type !== ChannelType.GuildText) {
    throw new Error("Run the command in a standard text channel or provide a valid panel channel.");
  }

  const savedSettings = currentSettings ?? {};
  const staffRole = await ensureTicketStaffRole({
    client,
    guild,
    currentSettings: savedSettings,
    providedRole: options.staffRole,
    providedRoleId: options.staffRoleId,
  });
  const category = await ensureTicketCategory({
    client,
    guild,
    currentSettings: savedSettings,
    staffRole,
  });
  const logChannel = await ensureLogChannel({
    client,
    guild,
    currentSettings: savedSettings,
    staffRole,
    category,
    providedChannel: options.ticketLog,
  });
  const defaults = getTicketDefaults(client);
  const panelColor = normalizeHexColor(options.panelColor ?? savedSettings.panelColor ?? defaults.panelColor) ?? defaults.panelColor;
  const nextSettings = {
    panelColor,
    panelTitle: options.title ?? savedSettings.panelTitle ?? defaults.panelTitle,
    panelDescription: options.message ?? savedSettings.panelDescription ?? defaults.panelDescription,
    panelFooter: options.footer ?? savedSettings.panelFooter ?? defaults.panelFooter,
    buttonLabel: options.buttonText ?? savedSettings.buttonLabel ?? defaults.buttonLabel,
    staffRoleId: staffRole.id,
    logChannelId: logChannel.id,
    categoryId: category.id,
    panelChannelId: fallbackPanelChannel.id,
  };

  const panelMessage = await upsertPanelMessage({
    client,
    guild,
    currentSettings: savedSettings,
    nextSettings,
    panelChannel: fallbackPanelChannel,
  });

  nextSettings.panelMessageId = panelMessage.id;
  const persistedSettings = await client.database.saveGuildSettings(guild.id, nextSettings);

  return {
    settings: persistedSettings,
    panelChannel: fallbackPanelChannel,
    panelMessage,
    staffRole,
    logChannel,
    category,
  };
}

function sanitizeChannelName(value) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "request"
  );
}

function buildTicketCreatedEmbed(client, user, ticket) {
  return new EmbedBuilder()
    .setColor(client.config.embedColors.success)
    .setTitle(`Ticket ${ticket.displayId}`)
    .setDescription(ticket.description)
    .addFields(
      { name: "Opened by", value: `${user}`, inline: true },
      { name: "Title", value: ticket.subject, inline: true }
    )
    .setFooter({ text: "Use the transcript or close button when needed." })
    .setTimestamp(ticket.openedAt ?? new Date());
}

function buildTicketOpenedLogEmbed(client, user, ticket) {
  return new EmbedBuilder()
    .setColor(client.config.embedColors.primary)
    .setTitle(`Ticket Opened: ${ticket.displayId}`)
    .setDescription(ticket.description)
    .addFields(
      { name: "Member", value: `${user}`, inline: true },
      { name: "Channel", value: `<#${ticket.channelId}>`, inline: true },
      { name: "Title", value: ticket.subject, inline: false }
    )
    .setTimestamp(ticket.openedAt ?? new Date());
}

function buildTicketClosureLogEmbed(client, ticket, closedByUser, ratingPromptSent, transcriptStatus) {
  const embed = new EmbedBuilder()
    .setColor(client.config.embedColors.warning)
    .setTitle(`Ticket Closed: ${ticket.displayId}`)
    .setDescription(ticket.description)
    .addFields(
      { name: "Owner ID", value: ticket.ownerId, inline: true },
      { name: "Closed by", value: `${closedByUser}`, inline: true },
      { name: "Rating DM", value: ratingPromptSent ? "Sent" : "Failed", inline: true },
      { name: "Transcript", value: transcriptStatus, inline: true },
      { name: "Title", value: ticket.subject, inline: false }
    )
    .setTimestamp(ticket.closedAt ?? new Date());

  if (ticket.ratingFeedback) {
    embed.addFields({ name: "Rating Feedback", value: ticket.ratingFeedback, inline: false });
  }

  return embed;
}

async function fetchTranscriptMessages(channel) {
  const messages = [];
  let before;

  while (true) {
    const fetchOptions = { limit: 100 };

    if (before) {
      fetchOptions.before = before;
    }

    const batch = await channel.messages.fetch(fetchOptions).catch(() => null);

    if (!batch?.size) {
      break;
    }

    messages.push(...batch.values());
    before = batch.last().id;

    if (batch.size < 100) {
      break;
    }
  }

  return messages.sort((left, right) => left.createdTimestamp - right.createdTimestamp);
}

function formatTranscriptMessage(message, ticket) {
  const username = message.author?.username ?? "unknown-user";
  const baseLine = `[${formatTranscriptTimestamp(message.createdTimestamp)}] [Ticket ${ticket.displayId}] [${username}]:`;
  const lines = [];

  if (message.content?.trim()) {
    const contentLines = message.content.split(/\r?\n/);
    lines.push(`${baseLine} ${contentLines.shift()}`);

    for (const line of contentLines) {
      lines.push(`  ${line}`);
    }
  } else {
    lines.push(`${baseLine} [no text content]`);
  }

  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      lines.push(`  [attachment] ${attachment.url}`);
    }
  }

  if (message.embeds.length > 0) {
    for (const [index, embed] of message.embeds.entries()) {
      const title = embed.title ?? "No title";
      const description = embed.description ? ` | ${embed.description}` : "";
      lines.push(`  [embed ${index + 1}] ${title}${description}`);
    }
  }

  if (message.stickers.size > 0) {
    for (const sticker of message.stickers.values()) {
      lines.push(`  [sticker] ${sticker.name}`);
    }
  }

  return lines.join("\n");
}

async function createTranscriptAttachment(channel, ticket, actor) {
  const messages = await fetchTranscriptMessages(channel);
  const transcriptLines = [
    "Conversation Transcript",
    `Ticket Number: ${ticket.displayId}`,
    `Guild ID: ${ticket.guildId}`,
    `Channel ID: ${ticket.channelId}`,
    `Owner ID: ${ticket.ownerId}`,
    `Generated by: ${actor.tag} (${actor.id})`,
    `Generated at: ${formatTranscriptTimestamp(Date.now())}`,
    `Title: ${ticket.subject}`,
    "",
  ];

  for (const message of messages) {
    transcriptLines.push(formatTranscriptMessage(message, ticket), "");
  }

  return new AttachmentBuilder(Buffer.from(transcriptLines.join("\n"), "utf8"), {
    name: `ticket-${ticket.displayId}-transcript.txt`,
  });
}

function buildTicketRatingPrompt(client, ticket) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`ticket:rating:${ticket._id}`)
    .setPlaceholder("Select a rating")
    .addOptions(
      { label: STAR.repeat(1), value: "1", description: "Very poor - tell us why" },
      { label: STAR.repeat(2), value: "2", description: "Poor - tell us why" },
      { label: STAR.repeat(3), value: "3", description: "Average" },
      { label: STAR.repeat(4), value: "4", description: "Excellent" },
      { label: STAR.repeat(5), value: "5", description: "Flawless" }
    );

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(client.config.embedColors.primary)
        .setTitle("Ticket Rating")
        .setDescription(
          `Your ticket "${ticket.subject}" has been closed. Please rate your support experience from 1 to 5.`
        )
        .setTimestamp(),
    ],
    components: [new ActionRowBuilder().addComponents(selectMenu)],
  };
}

function buildTicketRatingLogEmbed(client, ticket, user, rating) {
  const embed = new EmbedBuilder()
    .setColor(client.config.embedColors.success)
    .setTitle(`Ticket Rating: ${ticket.displayId}`)
    .addFields(
      { name: "Member", value: `${user}`, inline: true },
      { name: "Rating", value: `${formatRatingStars(rating)} (${rating}/5)`, inline: true },
      { name: "Title", value: ticket.subject, inline: false }
    )
    .setTimestamp(ticket.ratedAt ?? new Date());

  if (ticket.ratingFeedback) {
    embed.addFields({ name: "Why This Rating", value: ticket.ratingFeedback, inline: false });
  }

  return embed;
}

module.exports = {
  buildTicketActionRow,
  buildTicketClosureLogEmbed,
  buildTicketCreatedEmbed,
  buildTicketOpenedLogEmbed,
  buildTicketPanelEmbed,
  buildTicketRatingLogEmbed,
  buildTicketRatingPrompt,
  configureTicketSystem,
  createTranscriptAttachment,
  deleteStoredPanelMessage,
  ensureBotReadiness,
  ensureLogChannel,
  ensureTicketCategory,
  ensureTicketStaffRole,
  formatRatingStars,
  getDeleteDelayMs,
  getGuildSettings,
  getTicketByChannelId,
  sanitizeChannelName,
};


