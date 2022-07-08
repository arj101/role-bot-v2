const { CommandInteraction } = require("discord.js");
const Database = require("../database");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { createRankCard, skeletonRankCard } = require("../rank-card");

/**
 *
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
    await interaction.deferReply();
    await interaction.editReply({
        files: [skeletonRankCard()],
    });

    let user = interaction.options.getUser("member");
    if (user) user = await user.fetch(true);
    if (!user) user = interaction.member.user;

    let points = await db.readMemberData(
        interaction.guildId,
        user.id,
        "points"
    );
    if (!points) points = 0;

    const roles = await db.readGuildRoleConfig(interaction.guildId);

    await interaction.editReply({
        files: [
            await createRankCard(
                interaction,
                user,
                points,
                roles,
                await db.readPointUnit(interaction.guildId)
            ),
        ],
    });
}

module.exports = {
    commandName: "points",
    execute,
};
