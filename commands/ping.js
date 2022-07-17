const { CommandInteraction } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    // let config = await db.readGuildRoleConfig('13256')
    const someEmoji = interaction.client.emojis.resolveId('740849849687212073')
    interaction.reply({ content: `pong! ${someEmoji}`, ephemeral: true });
}

module.exports = {
    commandName: "ping",
    execute,
};
