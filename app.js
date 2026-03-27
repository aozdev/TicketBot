const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");

const config = require("./config.json");
const database = require("./src/database/mongoose");
const { loadCommands } = require("./src/handlers/commandHandler");
const { loadEvents } = require("./src/handlers/eventHandler");
const { loadComponents } = require("./src/handlers/componentHandler");
const { validateConfig } = require("./src/utils/configValidator");

validateConfig(config);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel],
});

client.config = config;
client.database = database;
client.commands = new Collection();
client.buttonHandlers = [];
client.modalHandlers = [];
client.selectMenuHandlers = [];

process.on("unhandledRejection", (error) => {
  console.error("[UnhandledRejection]", error);
});

process.on("uncaughtException", (error) => {
  console.error("[UncaughtException]", error);
});

(async () => {
  await database.connectDatabase(config.mongoUri);

  loadCommands(client);
  loadComponents(client);
  loadEvents(client);

  await client.login(config.token);
})();
