const fs = require("node:fs");
const path = require("node:path");

const commands = {};
const commandsPath = path.join(__dirname, "/commands");
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands[command.commandName] = command.execute;
}

module.exports = commands;
