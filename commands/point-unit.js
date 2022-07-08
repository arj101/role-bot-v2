const { CommandInteraction } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    await interaction.deferReply();
    let unit = interaction.options.getString("unit")
    if (unit.length < 1) {
        await interaction.editReply("Unit must be atleast one character long.")
        return
    }

    await db.writePointUnit(interaction.guildId, unit)
        .then(async _ => await interaction.editReply("Done!"))
        .catch(async e => await interaction.editReply(`Error occured while setting point unit:\n ${e}`))
}

module.exports = {
    commandName: "point-unit",

    execute,
};
