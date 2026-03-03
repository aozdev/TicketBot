import 'dotenv/config';
import {
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} from 'discord.js';

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = {
  categoryId: process.env.TICKET_CATEGORY_ID || null,
  supportRoleId: process.env.SUPPORT_ROLE_ID || null,
  logChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
  ticketPrefix: process.env.TICKET_CHANNEL_PREFIX || 'ticket',
  panelColor: Number(process.env.PANEL_COLOR || 0x5865f2),
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const isTicketChannel = (channel) =>
  channel?.type === ChannelType.GuildText && channel.name.startsWith(`${config.ticketPrefix}-`);

const isStaff = (member) => {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  if (config.supportRoleId && member.roles.cache.has(config.supportRoleId)) return true;
  return false;
};

const getTicketOwnerId = (channel) => {
  const topic = channel?.topic || '';
  const match = topic.match(/ticket-owner:(\d+)/);
  return match?.[1] ?? null;
};

const canManageTicket = (member, channel) => {
  const ownerId = getTicketOwnerId(channel);
  return member.id === ownerId || isStaff(member);
};

const findExistingTicket = async (guild, userId) => {
  const channels = await guild.channels.fetch();
  return (
    channels.find(
      (channel) =>
        channel?.type === ChannelType.GuildText &&
        channel.topic?.includes(`ticket-owner:${userId}`) &&
        channel.name.startsWith(`${config.ticketPrefix}-`),
    ) || null
  );
};

const sendLog = async (guild, embed) => {
  if (!config.logChannelId) return;
  const logChannel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (logChannel?.isTextBased()) {
    await logChannel.send({ embeds: [embed] });
  }
};

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ticket bot is online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'ticket') return;

  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const existing = await findExistingTicket(interaction.guild, interaction.user.id);
    if (existing) {
      await interaction.reply({
        content: `You already have an open ticket: ${existing}`,
        ephemeral: true,
      });
      return;
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';
    const baseName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 14) || 'user';
    const channelName = `${config.ticketPrefix}-${baseName}-${interaction.user.discriminator === '0' ? interaction.user.id.slice(-4) : interaction.user.discriminator}`;

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.categoryId || undefined,
      topic: `ticket-owner:${interaction.user.id} | reason:${reason}`,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        ...(config.supportRoleId
          ? [
              {
                id: config.supportRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              },
            ]
          : []),
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(config.panelColor)
      .setTitle('Ticket Created')
      .setDescription('A staff member will assist you soon. Use `/ticket close` when your issue is resolved.')
      .addFields(
        { name: 'Owner', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: true },
      )
      .setTimestamp();

    await ticketChannel.send({
      content: `${config.supportRoleId ? `<@&${config.supportRoleId}>` : 'Support team'} <@${interaction.user.id}>`,
      embeds: [welcomeEmbed],
    });

    await interaction.reply({
      content: `Your ticket has been created: ${ticketChannel}`,
      ephemeral: true,
    });

    await sendLog(
      interaction.guild,
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Ticket Opened')
        .setDescription(`${interaction.user} created ${ticketChannel}`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp(),
    );

    return;
  }

  if (sub === 'close') {
    const channel = interaction.channel;
    if (!isTicketChannel(channel)) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!canManageTicket(member, channel)) {
      await interaction.reply({
        content: 'You do not have permission to close this ticket.',
        ephemeral: true,
      });
      return;
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await interaction.reply({ content: `Closing ticket in 5 seconds. Reason: ${reason}` });

    await sendLog(
      interaction.guild,
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('Ticket Closed')
        .setDescription(`${interaction.user} closed ${channel}`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp(),
    );

    setTimeout(async () => {
      await channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason}`).catch(() => null);
    }, 5000);

    return;
  }

  if (sub === 'add') {
    const channel = interaction.channel;
    if (!isTicketChannel(channel)) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isStaff(member)) {
      await interaction.reply({ content: 'Only staff members can add users to tickets.', ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user', true);
    await channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply({ content: `${user} has been added to this ticket.` });
    return;
  }

  if (sub === 'remove') {
    const channel = interaction.channel;
    if (!isTicketChannel(channel)) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isStaff(member)) {
      await interaction.reply({ content: 'Only staff members can remove users from tickets.', ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user', true);
    await channel.permissionOverwrites.delete(user.id).catch(async () => {
      await channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
    });

    await interaction.reply({ content: `${user} has been removed from this ticket.` });
    return;
  }

  if (sub === 'rename') {
    const channel = interaction.channel;
    if (!isTicketChannel(channel)) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isStaff(member)) {
      await interaction.reply({ content: 'Only staff members can rename tickets.', ephemeral: true });
      return;
    }

    const name = interaction.options.getString('name', true).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90);
    await channel.setName(`${config.ticketPrefix}-${name}`);
    await interaction.reply({ content: `Ticket renamed to ${config.ticketPrefix}-${name}.` });
    return;
  }

  if (sub === 'claim') {
    const channel = interaction.channel;
    if (!isTicketChannel(channel)) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isStaff(member)) {
      await interaction.reply({ content: 'Only staff members can claim tickets.', ephemeral: true });
      return;
    }

    const ownerId = getTicketOwnerId(channel);
    await interaction.reply({
      content: `${interaction.user} has claimed this ticket.${ownerId ? ` Ticket owner: <@${ownerId}>` : ''}`,
    });
    return;
  }

  if (sub === 'info') {
    const channel = interaction.channel;
    if (!isTicketChannel(channel)) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const ownerId = getTicketOwnerId(channel);
    const infoEmbed = new EmbedBuilder()
      .setColor(config.panelColor)
      .setTitle('Ticket Information')
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Owner', value: ownerId ? `<@${ownerId}>` : 'Unknown', inline: true },
        { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
