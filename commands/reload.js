const { CommandInteraction } = require("discord.js");
const Database = require("../database");
const fs = require('fs')
const path = require('path')

/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    db.clearLocalDb();
    await interaction.reply("Cleared db cache!");
    const cacheDir = fs.readdirSync(path.join(__dirname, '/../leaderboards'))
    cacheDir.forEach(file => fs.rmSync(path.join(__dirname, '/../leaderboards', file)))
}

module.exports = {
    commandName: "reload",

    execute,
};
