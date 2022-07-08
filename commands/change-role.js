const { CommandInteraction, Role } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    await interaction.deferReply();

    let dbRoles = await db.readGuildRoleConfig(interaction.guildId);
    if (!dbRoles) dbRoles = {};

    let role = interaction.options.getRole("role");
    let points = interaction.options.getNumber("points", false);

    if (dbRoles[role.id] && !points) removeRole(interaction, db, dbRoles, role);
    else if (points) addRole(interaction, db, dbRoles, role, points);
    else interaction.editReply("Invalid arguments.");
}

/**
 *
 * @param {Object} currRoles
 * @param {Database} db
 * @param {CommandInteraction} interaction
 * @param {Role | import("discord-api-types/v9").APIRole} role
 * @param {number} points
 */
async function addRole(interaction, db, currRoles, role, points) {
    let currentPoints = Object.values(currRoles);
    if (currentPoints.includes(points)) {
        await interaction.editReply(
            `Sorry, there is already another role with ${points} points.`
        );
        return;
    }
    let newRoles = currRoles;
    newRoles[role.id] = points;
    db.writeGuildRoleConfig(interaction.guildId, newRoles)
        .catch(
            async (error) =>
                await interaction.editReply(`Error while adding role: ${error}`)
        )
        .then(async (_) => await interaction.editReply("Done!"));
}

/**
 * @param {CommandInteraction} interaction
 * @param {Object} currRoles
 * @param {Database} db
 * @param {Role | import("discord-api-types/v9").APIRole} role
 */
async function removeRole(interaction, db, currRoles, role) {
    let newRoles = currRoles;
    delete newRoles[role.id];

    await db
        .writeGuildRoleConfig(interaction.guildId, newRoles)
        .catch(async (e) => {
            await interaction.editReply(`Error while removing role: ${error}`);
        })
        .then(async (_) => await interaction.editReply("Done!"));
}

module.exports = {
    commandName: "change-role",

    execute,
};
