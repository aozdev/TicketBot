const { ActivityType } = require("discord.js");

async function updateSolvedPresence(client) {
  const solvedCount = await client.database.countSolvedTickets();

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: `/help | ${solvedCount} problems solved`,
        type: ActivityType.Playing,
      },
    ],
  });
}

module.exports = { updateSolvedPresence };
