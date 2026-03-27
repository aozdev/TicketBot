const path = require("node:path");

const { getJavaScriptFiles } = require("../utils/files");

function loadComponents(client) {
  const componentGroups = [
    { key: "buttonHandlers", directory: "buttons", label: "Button" },
    { key: "modalHandlers", directory: "modals", label: "Modal" },
    { key: "selectMenuHandlers", directory: "selects", label: "Select" },
  ];

  for (const group of componentGroups) {
    const directoryPath = path.join(process.cwd(), "src", "components", group.directory);
    const files = getJavaScriptFiles(directoryPath);
    let loadedCount = 0;

    for (const filePath of files) {
      delete require.cache[require.resolve(filePath)];

      const handler = require(filePath);

      if (!handler?.execute || (!handler?.customId && !handler?.customIdPrefix)) {
        console.warn(`[${group.label}] Skipped invalid file: ${path.basename(filePath)}`);
        continue;
      }

      client[group.key].push(handler);
      loadedCount += 1;
      console.log(`[${group.label}] Loaded: ${path.basename(filePath)}`);
    }

    console.log(`[${group.label}] Total loaded: ${loadedCount}`);
  }
}

module.exports = { loadComponents };
