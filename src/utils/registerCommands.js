async function registerApplicationCommands(client) {
  const payload = [...client.commands.values()].map((command) => command.data.toJSON());

  await client.application.commands.set(payload);
  console.log(`[Command] Registered globally: ${payload.length}`);
}

module.exports = { registerApplicationCommands };
