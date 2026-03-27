const { updateSolvedPresence } = require("../../utils/presence");
const { registerApplicationCommands } = require("../../utils/registerCommands");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    await registerApplicationCommands(client);
    await updateSolvedPresence(client);

    if (client.user.id !== client.config.clientId) {
      console.warn(
        `[Ready] config.json clientId (${client.config.clientId}) does not match the logged in application (${client.user.id}).`
      );
    }

    console.log(`[Ready] Logged in as ${client.user.tag}`);
  },
};
