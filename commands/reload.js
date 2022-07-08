const { CommandInteraction } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    db.clearLocalDb();
    await interaction.reply("Cleared db cache!");
}

module.exports = {
    commandName: "reload",

    execute,
};
