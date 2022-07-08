const { Message } = require("discord.js");
const Database = require("./database");
const PointsManager = require("./points-manager");

let bannedWords = JSON.parse(
    process.env.BANNED_WORDS ? process.env.BANNED_WORDS : '{ "words": [] }'
);

/**
 *
 * @param {Message} msg
 */
function invalidateMessage(msg) {
    return (
        msg.author.bot ||
        msg.content.length < 3 ||
        msg.content
            .toLowerCase()
            .split(" ")
            .filter((s) => bannedWords.words.includes(s)).length >= 1
    );
}

/**
 *
 * @param {Message} msg
 * @param {Database} db
 * @param {PointsManager} pointsManager
 */

async function handleMessage(msg, db, pointsManager) {
    if (invalidateMessage(msg)) return;

    let currPoints = await db.readMemberData(
        msg.guildId,
        msg.author.id,
        "points"
    );
    if (!currPoints) currPoints = 0;
    let roles = await db.readGuildRoleConfig(msg.guildId);
    if (!roles) roles = {};

    if (typeof currPoints !== "number")
        throw new Error(
            `Fatal error: ${msg.guildId}/${msg.author.id}/points is not a number`
        );

    let deltaPoint =
        currPoints < 100e3
            ? Math.ceil(1 + Math.random() * 9 * ((100e3 - currPoints) / 100e3))
            : 1;

    let newPoints = currPoints + deltaPoint;

    let roleFromPt = (pt) => {
        let ptRole;
        let rolePt = 0;
        for (const role of Object.keys(roles)) {
            if (roles[role] > rolePt && roles[role] <= pt) {
                ptRole = role;
                rolePt = roles[role];
            }
        }
        return ptRole;
    };

    let currRole = roleFromPt(currPoints);
    let newRole = roleFromPt(newPoints);

    pointsManager.setPoints(msg.guildId, msg.author.id, newPoints);

    if (newRole != currRole) await handleLevelUp(msg, currRole, newRole, db);
}

/**
 *
 * @param {Message} msg
 * @param {Database} db
 * @param {string} newRoleId
 * @param {string} oldRoleId
 */

async function handleLevelUp(msg, oldRoleId, newRoleId, db) {
    let messagingChannelId = await db.readMessagingChannel(msg.guildId);
    let messagingChannel;
    if (!messagingChannelId) {
        messagingChannel = msg.channel;
    } else {
        messagingChannel = await msg.client.channels.fetch(messagingChannelId);
        if (!messagingChannel) messagingChannel = msg.channel;
    }

    let oldRole = await msg.guild.roles.fetch(oldRoleId);
    if (oldRole && oldRoleId) {
        try {
            await msg.member.roles.remove(oldRole);
        } catch (e) {
            throw e;
        }
    }

    let newRole = await msg.guild.roles.fetch(newRoleId);
    newRole = msg.guild.roles.cache.find((r) => r.id == newRoleId);
    if (!newRole || !newRoleId) {
        messagingChannel.send(
            `Uh oh, role id ${newRoleId} not found in this server.`
        );
        return;
    }
    try {
        await msg.member.roles.add(newRole);
    } catch (e) {
        throw e;
    }

    messagingChannel.send(
        `GG <@${msg.member.id}>, your new rank is "${newRole.name}"`
    );
}

module.exports = handleMessage;
