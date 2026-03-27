const path = require("node:path");

const { getJavaScriptFiles } = require("../utils/files");

function loadEvents(client) {
  const eventDirectory = path.join(process.cwd(), "src", "events");
  const eventFiles = getJavaScriptFiles(eventDirectory);
  let loadedCount = 0;

  for (const filePath of eventFiles) {
    delete require.cache[require.resolve(filePath)];

    const event = require(filePath);

    if (!event?.name || !event?.execute) {
      console.warn(`[Event] Skipped invalid file: ${path.basename(filePath)}`);
      continue;
    }

    const wrappedExecute = (...args) => event.execute(...args, client);

    if (event.once) {
      client.once(event.name, wrappedExecute);
    } else {
      client.on(event.name, wrappedExecute);
    }

    loadedCount += 1;
    console.log(`[Event] Loaded: ${path.basename(filePath)}`);
  }

  console.log(`[Event] Total loaded: ${loadedCount}`);
}

module.exports = { loadEvents };
