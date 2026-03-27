const path = require("node:path");

const { getJavaScriptFiles } = require("../utils/files");

function loadCommands(client) {
  const commandDirectory = path.join(process.cwd(), "src", "commands");
  const commandFiles = getJavaScriptFiles(commandDirectory);

  for (const filePath of commandFiles) {
    delete require.cache[require.resolve(filePath)];

    const command = require(filePath);

    if (!command?.data || !command?.execute) {
      console.warn(`[Command] Skipped invalid file: ${path.basename(filePath)}`);
      continue;
    }

    client.commands.set(command.data.name, command);
    console.log(`[Command] Loaded: ${path.basename(filePath)}`);
  }

  console.log(`[Command] Total loaded: ${client.commands.size}`);
}

module.exports = { loadCommands };
