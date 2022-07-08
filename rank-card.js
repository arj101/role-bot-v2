const path = require("node:path");
const hexToRgba = require("hex-to-rgba");
const { CommandInteraction, User, Client } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { UserFlags } = require("discord-api-types/v9");

function loadFonts() {
    registerFont(path.join(__dirname, "/fonts/TwitterColorEmoji-SVGinOT.ttf"), {
        family: "Twitter Color Emoji",
    });

    registerFont(path.join(__dirname, "/fonts/Poppins-Regular.ttf"), {
        family: "Poppins",
    });

    registerFont(path.join(__dirname, "/fonts/Poppins-SemiBold.ttf"), {
        family: "Poppins Bold",
    });
}

/**
 *
 * @param {CommandInteraction} interaction
 * @param {string} id
 * @returns
 */
async function roleNameFromId(interaction, id) {
    return (await interaction.guild.roles.fetch(id)).name;
}

function skeletonRankCard() {
    const canvas = createCanvas(1516, 492);
    const ctx = canvas.getContext("2d");

    ctx.rect(0, 0, canvas.width, canvas.height);
    let grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "rgba(44, 50, 55, 1)");
    grd.addColorStop(1, "rgba(33, 44, 54, 1)");

    ctx.fillStyle = grd;
    ctx.fill();

    let grd2 = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd2.addColorStop(1, "rgba(50, 50, 50, 0.5)");
    grd2.addColorStop(0, "rgba(250, 250, 250, 0.1)");

    ctx.fillStyle = grd2;

    drawRoundedRectangle(ctx, 502, 316, 914, 76, 38);
    ctx.fill();

    drawRoundedRectangle(ctx, 1216, 57, 200, 96, 38);
    ctx.fill();

    drawRoundedRectangle(ctx, 502, 79, 450, 64, 38);
    ctx.fill();

    drawRoundedRectangle(ctx, 1216, 172, 200, 36, 38);
    ctx.fill();

    drawRoundedRectangle(ctx, 71, 71, 350, 350, 175);
    ctx.fill();

    return canvas.toBuffer();
}

/**
 * @param {Client} client
 * @param {CommandInteraction} interaction
 * @param {User} user
 * @param {string} guildId
 * @param {number} points
 * @param {*} avatarURL
 * @param {*} tagName
 * @param {*} status
 * @param {*} roles
 * @returns
 */

async function createRankCard(
    interaction,
    client,
    user,
    guildId,
    points,
    roles
) {
    const member = await interaction.guild.members.fetch({
        user,
        withPresences: true,
    });
    console.log(member);
    const name = member.displayName;
    const avatarURL = user.displayAvatarURL({
        format: "png",
    });
    const tagName = user.tag;
    const status = member.presence.status;
    roles = roles ? roles : {};

    const canvas = createCanvas(1516, 492);
    const ctx = canvas.getContext("2d");

    let currentRankPoint = -1;
    let currentRank;
    let nextRank;
    let nextRankPoint = Infinity;

    for (const role of Object.keys(roles)) {
        let rolePoint = roles[role];

        if (rolePoint > currentRankPoint && rolePoint <= points) {
            currentRankPoint = rolePoint;
            currentRank = await roleNameFromId(interaction, role);
        }
    }

    for (const role of Object.keys(roles)) {
        let rolePoint = roles[role];

        if (rolePoint < nextRankPoint && rolePoint > points) {
            nextRankPoint = rolePoint;
            nextRank = await roleNameFromId(interaction, role);
        }
    }

    ctx.font = "30px Poppins";

    ctx.beginPath();

    ctx.rect(0, 0, canvas.width, canvas.height);
    let grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "rgba(44, 50, 55, 1)");
    grd.addColorStop(1, "rgba(33, 44, 54, 1)");

    ctx.fillStyle = grd;
    ctx.fill();

    let rankBelowPoint;
    if (currentRankPoint == -1) rankBelowPoint = 0;
    else rankBelowPoint = currentRankPoint;

    let rankAbovePoint = nextRankPoint;

    let rankPointDiff = rankAbovePoint - rankBelowPoint;

    let memberPointrankPointDiff_Diff = points - rankBelowPoint;

    let pointsRatio = memberPointrankPointDiff_Diff / rankPointDiff;

    if (rankAbovePoint == Infinity) pointsRatio = 1;

    let progressBarWidth = 914 * pointsRatio;

    if (progressBarWidth < 76) progressBarWidth = 76;

    drawRoundedRectangle(ctx, 502, 316, 914, 76, 38);
    ctx.fillStyle = "rgba(54, 60, 66, 1)";
    ctx.fill();

    drawRoundedRectangle(ctx, 502, 316, progressBarWidth, 76, 38);
    ctx.fillStyle = "rgba(39, 152, 239, 1)";
    ctx.fill();

    let pointsFormatted = formatNumber(points);

    let fontHeight = 96;

    ctx.font = `${fontHeight}px Poppins Extra Bold`;
    ctx.fillStyle = "rgba(39, 152, 239, 1)";
    ctx.fillText(
        pointsFormatted,
        1416 - ctx.measureText(pointsFormatted).width,
        57 + fontHeight
    );

    let pointsWidth = ctx.measureText(pointsFormatted).width;

    let formatedMemberName = name;

    fontHeight = 64;
    ctx.font = `${fontHeight}px Poppins Extra Bold, Twitter Color Emoji`;

    ctx.fillStyle = "rgba(255, 255, 255, 1)";

    if (
        ctx.measureText(formatedMemberName).width + 502 >
        1416 - pointsWidth - 100
    ) {
        while (
            ctx.measureText(formatedMemberName).width + 502 >
            1416 - pointsWidth - 100
        ) {
            formatedMemberName = formatedMemberName.slice(
                0,
                formatedMemberName.length - 1
            );
        }

        formatedMemberName = formatedMemberName.trim() + "...";
    }

    ctx.fillText(formatedMemberName, 502, 79 + fontHeight);

    fontHeight = 36;
    ctx.font = `${fontHeight}px Poppins`;
    ctx.fillStyle = "rgba(175,175, 175, 1)";
    ctx.fillText(tagName, 502, 172 + fontHeight);

    fontHeight = 36;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.font = `${fontHeight}px Poppins Semi Bold`;

    if (nextRankPoint != Infinity) {
        let role2 = nextRank;
        ctx.fillText(
            role2,
            1416 - ctx.measureText(role2).width,
            258 + fontHeight
        );

        if (currentRankPoint != -1) {
            ctx.fillText(currentRank, 502, 258 + fontHeight);
        }
    } else if (currentRankPoint != -1) {
        fontHeight = 64;
        ctx.font = `${fontHeight}px Poppins Semi Bold`;
        ctx.fillText(
            currentRank,
            958.5 - ctx.measureText(currentRank).width / 2,
            310 + fontHeight
        );
    }

    fontHeight = 36;
    ctx.font = `${fontHeight}px Poppins`;
    ctx.fillStyle = "rgba(175, 175, 175, 1)";
    ctx.fillText(
        `${process.env.POINT_UNIT}`,
        1416 - ctx.measureText(`${process.env.POINT_UNIT}`).width,
        172 + fontHeight
    );

    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;

    ctx.shadowColor = "transparent";

    let image = await loadImage(avatarURL);

    drawRoundedRectangle(ctx, 71, 71, 350, 350, 175);
    drawRoundedStrokeRectangle(
        ctx,
        71,
        71,
        350,
        350,
        175,
        "rgba(105, 105, 105, 1)"
    );

    ctx.save();
    ctx.clip();
    ctx.drawImage(image, 71, 71, 350, 350);
    ctx.restore();

    let color = "rgba(0, 255, 133, 1)";

    switch (status) {
        case "online":
            color = "rgba(0, 255, 133, 1)";
            break;
        case "idle":
            color = "rgba(255, 92, 0, 1)";
            break;
        case "dnd":
            color = "rgba(255, 92, 0,1)";
            break;
        case "offline":
            color = "rgba(175, 175, 175, 1)";
            break;
    }

    drawRoundedRectangle(ctx, 366, 322, 50, 50, 25);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowColor = "transparent";

    return canvas.toBuffer();
}

function drawRoundedRectangle(context, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
    return context;
}

function drawRoundedStrokeRectangle(context, x, y, w, h, r, rgba, width = 10) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    context.beginPath();
    context.lineWidth = width;
    context.strokeStyle = rgba;
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.stroke();
    context.closePath();
    return context;
}

function formatNumber(num) {
    if (num > 999 && num < 1000000) {
        let numDivided = (num / 1000).toFixed(2);

        if (num >= 100000) {
            numDivided = (num / 1000).toFixed(1);
        }

        let numFormatted = numDivided + "K";

        return numFormatted;
    }

    if (num > 999999) {
        let numDivided = (num / 1000000).toFixed(2);

        let numFormatted = toString(numDivided) + "M";
        return numFormatted;
    }

    return num;
}

module.exports = { loadFonts, createRankCard, skeletonRankCard };
