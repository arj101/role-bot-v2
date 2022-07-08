const { CommandInteraction } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    // let config = await db.readGuildRoleConfig('13256')
    interaction.reply({ content: "lubble", ephemeral: true });
}

module.exports = {
    commandName: "nothing",

    execute,
};
