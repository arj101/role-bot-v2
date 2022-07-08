const { CommandInteraction } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    await interaction.deferReply();
    let channel = interaction.options.getChannel("channel");
    if (channel.type != "GUILD_TEXT") {
        await interaction.editreply("Must be a text channel");
        return;
    }
    db.writeMessagingChannel(interaction.guildId, channel.id)
        .catch(
            async (e) =>
                await interaction.editReply(
                    `Error settings messaging channel: ${e}`
                )
        )
        .then(async (_) => await interaction.editReply("Done!"));
}

module.exports = {
    commandName: "messaging-channel",

    execute,
};
