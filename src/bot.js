import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} from 'discord.js';

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Eksik ortam degiskenleri: ${missing.join(', ')}`);
}

const settings = {
  embed: {
    title: process.env.EMBED_TITLE || 'Destek Merkezi',
    description:
      process.env.EMBED_DESCRIPTION ||
      'Aşağıdaki butonlardan birine tıklayarak işlem başlatabilirsin.',
    color: Number(process.env.EMBED_COLOR || 0x5865f2),
    thumbnail: process.env.EMBED_THUMBNAIL || null,
    footer: process.env.EMBED_FOOTER || 'TicketBot',
  },
  buttons: {
    open: {
      label: process.env.BUTTON_OPEN_LABEL || 'Ticket Aç',
      style: process.env.BUTTON_OPEN_STYLE || 'Success',
      emoji: process.env.BUTTON_OPEN_EMOJI || '🎫',
    },
    info: {
      label: process.env.BUTTON_INFO_LABEL || 'Bilgi',
      style: process.env.BUTTON_INFO_STYLE || 'Primary',
      emoji: process.env.BUTTON_INFO_EMOJI || 'ℹ️',
    },
    close: {
      label: process.env.BUTTON_CLOSE_LABEL || 'Ticket Kapat',
      style: process.env.BUTTON_CLOSE_STYLE || 'Danger',
      emoji: process.env.BUTTON_CLOSE_EMOJI || '🔒',
    },
  },
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const buttonStyleFromText = (value) => {
  const availableStyles = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
  };

  return availableStyles[value] ?? ButtonStyle.Secondary;
};

const createPanelEmbed = () => {
  const embed = new EmbedBuilder()
    .setTitle(settings.embed.title)
    .setDescription(settings.embed.description)
    .setColor(settings.embed.color)
    .setFooter({ text: settings.embed.footer })
    .setTimestamp();

  if (settings.embed.thumbnail) {
    embed.setThumbnail(settings.embed.thumbnail);
  }

  return embed;
};

const createPanelButtons = () => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel(settings.buttons.open.label)
      .setStyle(buttonStyleFromText(settings.buttons.open.style))
      .setEmoji(settings.buttons.open.emoji),
    new ButtonBuilder()
      .setCustomId('ticket_info')
      .setLabel(settings.buttons.info.label)
      .setStyle(buttonStyleFromText(settings.buttons.info.style))
      .setEmoji(settings.buttons.info.emoji),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel(settings.buttons.close.label)
      .setStyle(buttonStyleFromText(settings.buttons.close.style))
      .setEmoji(settings.buttons.close.emoji),
  );
};

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot hazir: ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'panel') {
      await interaction.reply({
        embeds: [createPanelEmbed()],
        components: [createPanelButtons()],
      });
      return;
    }
  }

  if (!interaction.isButton()) {
    return;
  }

  if (interaction.customId === 'ticket_open') {
    await interaction.reply({
      content: `✅ ${interaction.user}, ticket oluşturma akışı burada başlatılabilir.`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === 'ticket_info') {
    await interaction.reply({
      content:
        'ℹ️ Bu panel, butonlar ve embed başlığı/açıklaması dahil olmak üzere .env üzerinden özelleştirilebilir.',
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === 'ticket_close') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const canClose = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!canClose) {
      await interaction.reply({
        content: '❌ Bu işlemi yapmak için `Kanalları Yönet` yetkisine ihtiyacın var.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '🔒 Ticket kapatma işlemi burada uygulanabilir.',
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
