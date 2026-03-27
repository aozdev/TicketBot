function isMissingValue(value) {
  if (!value || typeof value !== "string") {
    return true;
  }

  return value.startsWith("YOUR_");
}

function validateConfig(config) {
  const requiredKeys = ["token", "clientId", "developerId", "mongoUri"];
  const missingKeys = requiredKeys.filter((key) => isMissingValue(config[key]));

  if (missingKeys.length > 0) {
    throw new Error(`Missing config.json values: ${missingKeys.join(", ")}`);
  }
}

module.exports = { validateConfig };
