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
    embed.setColor("#2798EF")


    let rolesArr = Object.keys(roles).sort((a, b) => roles[a] - roles[b]);
    for (const roleId of rolesArr) {
        let roleName = (await interaction.guild.roles.fetch(roleId)).name;
        embed.addField(`__${roleName}__`, `**${roles[roleId]}** ${await db.readPointUnit(interaction.guildId)}`);
    }
    embed.setTimestamp(new Date());

    await interaction.editReply({ embeds: [embed] });
}

module.exports = {
    commandName: "roles",

    execute,
};
