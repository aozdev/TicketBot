# TicketBot

TicketBot is a fully slash-command Discord.js v14 ticket bot for structured support workflows on Discord.
It uses MongoDB through Mongoose, keeps the codebase simple, and focuses on a clean, customizable, open-source friendly ticket system.

## Highlights

- Slash commands only
- Discord.js v14 architecture
- MongoDB storage through Mongoose
- Modal-based ticket creation
- Private ticket channels with role-based visibility
- Staff-only log channels under the ticket category
- Transcript generation on demand and on close
- DM-based rating flow with written feedback for low ratings
- Guild-based solved ticket statistics in `/stats`
- GitHub button inside `/stats`
- Editable ticket panel content and panel color
- Manual setup and automatic setup support
- Full reset command for guild ticket data

## Commands

### General

- `/help`
  Shows the help menu and command groups.

- `/ping`
  Shows gateway latency and round-trip time.

- `/stats`
  Shows server-specific ticket stats, runtime details, CPU, RAM, latency, version information, and a GitHub link button.

### Ticket Management

These commands are visible to members with the `Manage Messages` permission.

- `/setup-ticket`
  Creates or refreshes the ticket system.

- `/settings`
  Shows the current ticket configuration or updates the existing setup.

- `/reset`
  Fully removes the configured ticket system for the current guild and resets the ticket counter.

## Visual Walkthrough

Add your real screenshots under `assets/screenshots/` using the file names below. This keeps the README ready for a polished GitHub presentation without broken image links.

### 1. System Panel

Screenshot path: `assets/screenshots/01-system-panel.png`

Use this section for the main ticket panel message. This is the first thing users see before opening a ticket, so the screenshot should clearly show the embed layout, button text, and overall visual style.

### 2. Ticket Creation Modal

Screenshot path: `assets/screenshots/02-ticket-modal.png`

Show the modal with the required title and description fields. This is one of the strongest preview shots because it immediately communicates that the system is structured and not just a basic button click.

### 3. Active Ticket Channel

Screenshot path: `assets/screenshots/03-active-ticket.png`

Use a screenshot of an open ticket channel with the action row visible. Make sure `Conversation Transcript` and `Close Ticket` are both visible so the workflow is obvious at a glance.

### 4. Staff Log Channel

Screenshot path: `assets/screenshots/04-staff-log.png`

Show how ticket events are logged for staff. A strong capture here helps the project feel operational rather than purely cosmetic.

### 5. Transcript Output

Screenshot path: `assets/screenshots/05-transcript.png`

Use either the transcript result from the button flow or the uploaded transcript file inside the log channel. This makes the repository feel much more complete and production-ready.

### 6. Rating Flow

Screenshot path: `assets/screenshots/06-rating-menu.png`

Show the DM rating menu after ticket closure. If possible later, add a second capture for the low-rating feedback modal as well.

## Ticket Workflow

### Setup

TicketBot supports both manual setup and automatic setup.

Manual setup:
- Use `/setup-ticket` with your preferred staff role, log channel, panel channel, and panel text values.
- If the selected log channel is outside the ticket category, the bot moves it under the category automatically.
- The log channel is permission-synced so only the configured staff role and the bot can see it.

Automatic setup:
- Run `/setup-ticket` without optional values.
- The bot creates the staff role, ticket category, and log channel when they do not already exist.
- The panel message is sent in the current text channel unless `panel-channel` is provided.

### Opening a Ticket

1. A member presses the ticket panel button.
2. A modal opens.
3. The member must enter:
   - a title with at least 5 characters
   - a description with at least 20 characters
4. The bot creates a private ticket channel under the configured ticket category.
5. Only these targets can see the channel:
   - the ticket opener
   - the configured staff role
   - the bot
6. The ticket message includes:
   - `Conversation Transcript`
   - `Close Ticket`

### Transcript Flow

The `Conversation Transcript` button generates a plain text transcript for the current ticket and returns it as an ephemeral file.
When a ticket closes, a transcript is also generated automatically and uploaded to the log channel.

Transcript output includes:
- date
- time
- day name
- ticket number
- username
- message content
- attachment URLs when present
- embed summaries when present

Example line format:

```text
[26.03.2026 18:25:10 Thursday] [Ticket 0001] [username]: message content
```

### Closing and Rating

When a ticket is closed:
- the ticket is marked as closed in MongoDB
- a close log embed is sent to the log channel
- the transcript file is uploaded to the log channel
- the ticket opener receives a DM rating menu
- the ticket channel is deleted after 10 seconds by default

Rating meanings:
- `&#11088;` - Very poor
- `&#11088;&#11088;` - Poor
- `&#11088;&#11088;&#11088;` - Average
- `&#11088;&#11088;&#11088;&#11088;` - Excellent
- `&#11088;&#11088;&#11088;&#11088;&#11088;` - Flawless

Rating behavior:
- 1 or 2 stars open a required feedback modal
- 3, 4, or 5 stars are saved immediately
- ratings are stored in MongoDB
- rating logs are forwarded to the ticket log channel

## Configuration

Edit `config.json` before starting the bot.

```json
{
  "token": "YOUR_BOT_TOKEN",
  "clientId": "YOUR_CLIENT_ID",
  "developerId": "YOUR_DEVELOPER_ID",
  "mongoUri": "YOUR_MONGODB_URI",
  "embedColors": {
    "primary": "#5865F2",
    "success": "#16A34A",
    "error": "#DC2626",
    "warning": "#D97706"
  },
  "ticket": {
    "panelColor": "#1F2937",
    "panelTitle": "Support Tickets",
    "panelDescription": "Use the button below to open a private ticket. A short form will ask for a title and description before the channel is created.",
    "panelFooter": "Tickets are visible only to the requester and the configured staff role.",
    "buttonLabel": "Open Ticket",
    "closeButtonLabel": "Close Ticket",
    "staffRoleName": "Ticket Staff",
    "categoryName": "Tickets",
    "logChannelName": "ticket-logs",
    "deleteDelaySeconds": 10
  }
}
```

Notes:
- `embedColors.primary` is the stable bot embed color.
- `ticket.panelColor` only affects the ticket panel embed.
- `deleteDelaySeconds` controls how long the ticket channel stays open after closure.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Fill `config.json` with your real values.

3. Start the bot:

```bash
npm start
```

Optional local starter:

```bat
start.bat
```

Optional validation:

```bash
npm run check
```

## Required Bot Permissions

The bot should have at least these permissions:

- View Channels
- Send Messages
- Read Message History
- Embed Links
- Attach Files
- Manage Channels
- Manage Roles

The bot role must be placed above the roles it needs to manage.
If the bot role is not high enough, ticket setup and ticket creation are intentionally blocked.

## Logging

Startup logs are intentionally plain.
Examples:

- `[Database] Connected: MongoDB`
- `[Event] Loaded: ready.js`
- `[Command] Loaded: setup-ticket.js`
- `[Button] Loaded: transcriptTicket.js`

## Slash Command Registration

Application commands are registered globally when the bot becomes ready.
Discord may take a short time to refresh global slash commands after a restart.

## Project Structure

```text
app.js
config.json
start.bat
assets/
  screenshots/
src/
  commands/
    general/
    system/
  components/
    buttons/
    modals/
    selects/
  database/
    mongoose.js
  events/
    client/
  handlers/
  utils/
```

## License

This project is released under the MIT License.
