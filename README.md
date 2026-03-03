# TicketBot (Discord.js v14)

A **modern, slash-command-only** ticket bot built with Discord.js v14.

## Features
- `/ticket create` to open private support channels
- `/ticket close` to close and delete ticket channels
- `/ticket add` and `/ticket remove` for participant management
- `/ticket rename` and `/ticket claim` for staff workflow
- `/ticket info` to view ticket metadata
- Optional support role ping and optional ticket logs channel

## Setup
```bash
npm install
cp .env.example .env
```

Fill in your `.env` values:
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`

Optional settings:
- `TICKET_CATEGORY_ID`
- `SUPPORT_ROLE_ID`
- `TICKET_LOG_CHANNEL_ID`
- `TICKET_CHANNEL_PREFIX`
- `PANEL_COLOR`

## Register slash commands
```bash
node src/register-commands.js
```

## Start the bot
```bash
npm start
```

## Slash command usage
- `/ticket create reason:<text>`
- `/ticket close reason:<text>`
- `/ticket add user:@member`
- `/ticket remove user:@member`
- `/ticket rename name:<new-name>`
- `/ticket claim`
- `/ticket info`

## Notes
- Staff permissions are determined by either `ManageChannels` permission or the role set in `SUPPORT_ROLE_ID`.
- Tickets are identified by channel name prefix and owner metadata in channel topic.
