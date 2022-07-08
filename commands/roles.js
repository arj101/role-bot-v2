const { CommandInteraction, MessageEmbed } = require("discord.js");
const Database = require("../database");
/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    await interaction.deferReply();
    let roles = await db.readGuildRoleConfig(interaction.guildId);
    if (!roles) roles = {};

    let embed = new MessageEmbed().setTitle("Roles");

    let rolesArr = Object.keys(roles).sort((a, b) => roles[a] - roles[b]);
    for (const roleId of rolesArr) {
        let roleName = (await interaction.guild.roles.fetch(roleId)).name;
        embed.addField(roleName, `${roles[roleId]} ${process.env.POINT_UNIT}`);
    }

    await interaction.editReply({ embeds: [embed] });
}

module.exports = {
    commandName: "roles",

    execute,
};
