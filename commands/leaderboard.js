//AHHHHHHHHHH
const fs = require("fs");
const path = require("path");
const { CommandInteraction, MessageButton, MessageActionRow } = require("discord.js");
const Database = require("../database");
const { createCanvas, loadImage, CanvasRenderingContext2D } = require("canvas");
const { renderEmojiText, drawRoundedRectangle, drawRoundedStrokeRectangle, formatNumber } = require("../rank-card");
const { roleFromPt } = require("../handle-msg")


/**
 * @param {String} text
 */
CanvasRenderingContext2D.prototype.textHeight = function (text) {
  const textDimensions = this.measureText(text)
  return textDimensions.actualBoundingBoxAscent + textDimensions.actualBoundingBoxDescent
}

async function drawLeaderboard(best, pointUnit, pageLimit = 5, pageIdx = 0) {
  const height = 291;
  const spacing = 28;

  const page = best.slice(pageIdx * (pageLimit - 1), (pageIdx + 1) * pageLimit)
  const idxOffset = pageIdx * pageLimit;

  const canvas = createCanvas(
    1516,
    page.length > 0 ?
      (height + spacing) * page.length + spacing
      : height + 2 * spacing
  )
  const ctx = canvas.getContext("2d");
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  bgGradient.addColorStop(0, "rgba(126, 88, 143, 1)");
  bgGradient.addColorStop(1, "rgba(36, 115, 175, 1)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)


  if (page.length <= 0) {
    ctx.fillStyle = "white";
    ctx.font = "100px Poppins Bold";
    const text = "Oops, no members found 🧐️"
    const textLength = ctx.measureText(text).width;
    const textHeight = ctx.textHeight(text);

    await renderEmojiText(ctx, text, { x: canvasWidth / 2 - textLength / 2, y: canvasHeight / 2 - textHeight / 2 }, 100);
    return canvas.toBuffer();
  }

  for (let i = 0; i < page.length; i++) {
    let yoff = spacing + i * (height + spacing);
    let xoff = 23;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    drawRoundedRectangle(ctx, xoff, yoff, canvasWidth - 2 * xoff, height, 40)
    ctx.fill()

    //profile pic
    const img = await loadImage(page[i].avatar);
    drawRoundedStrokeRectangle(ctx, xoff + 275, yoff + 16, 260, 260, 150, 'rgba(255, 255, 255, 0.39)', 10)
    ctx.save();
    drawRoundedRectangle(ctx, xoff + 280, yoff + 21, 250, 250, 126)
    ctx.clip();
    ctx.drawImage(img, xoff + 280, yoff + 21, 250, 250);
    ctx.restore();

    //1st 2nd 3rd etc
    ctx.fillStyle = "white";
    ctx.font = "120px Poppins Bold";
    const rankText = String(i + 1)
    await renderEmojiText(ctx, String(idxOffset + i + 1), { x: xoff + 165 - ctx.measureText(rankText).width, y: yoff + height / 2 - ctx.textHeight(rankText) }, 120, 120);


    //points
    ctx.font = "80px Poppins Bold";
    const pointsText = formatNumber(page[i].points)
    const ptTextWidth = ctx.measureText(pointsText).width;
    const ptGradient = ctx.createLinearGradient(1244, yoff + ctx.textHeight(pointsText) / 2, 1447, yoff + ctx.textHeight(pointsText) / 2);
    ptGradient.addColorStop(0, "rgba(80, 179, 255, 1)");
    ptGradient.addColorStop(1, "rgba(34, 154, 246, 1)");
    ctx.fillStyle = ptGradient;
    await renderEmojiText(ctx, pointsText, { x: canvasWidth - ptTextWidth - 69, y: yoff + 89 }, 80, 80);

    ctx.font = "40px Poppins Medium"
    const ptUnitTextWidth = ctx.measureText(pointUnit).width;
    ctx.fillStyle = 'white'
    await renderEmojiText(ctx, pointUnit, { x: canvasWidth - ptUnitTextWidth - 69, y: yoff + 178 }, 40, 40)

    //name
    ctx.font = "60px Poppins Bold";
    let displayName = page[i].displayName;
    if (ctx.measureText(displayName).width + xoff + 580 > canvasWidth - ptTextWidth - 80) {
      while (ctx.measureText(displayName).width + xoff + 580 > canvasWidth - ptTextWidth - 95) {
        displayName = displayName.split('').slice(0, displayName.length - 1).join('');
      }

      displayName = displayName.trim() + "...";
    }
    await renderEmojiText(ctx, displayName, { x: xoff + 580, y: yoff + 35 }, 60, 60);
    ctx.font = "30px Poppins Medium"
    await renderEmojiText(ctx, page[i].username, { x: xoff + 580, y: yoff + 122 }, 30, 30)

    //role stuff
    ctx.font = "40px Poppins Bold";
    const hexColorString = `#${page[i].bestRole?.color?.toString(16)}`
    const roleName = page[i].bestRole?.name;
    const grayScale = hexToGrayscale(hexColorString)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = hexColorString;
    if (roleName) {
      if (grayScale <= 125) await renderEmojiText(ctx, roleName, { x: xoff + 580, y: yoff + 202 }, 40, 40, 0, true);
      await renderEmojiText(ctx, roleName, { x: xoff + 580, y: yoff + 202 }, 40, 40);
    }
  }

  return canvas.toBuffer();
}


async function getUsers(db, guildId) {
  const loc = path.join(__dirname, "..", "leaderboards", `${guildId}.json`);
  const maxCacheTime = 300000; //5min in millis

  //check file creation date
  let creationTime = 0;
  if (fs.existsSync(loc)) creationTime = fs.statSync(loc).ctimeMs;

  //checks if current time is less than cacheTime
  let users = [];

  let diff = new Date().getTime() - Math.floor(creationTime);
  if (diff < maxCacheTime) {
    console.log("Got cached leaderboard");
    users = JSON.parse(fs.readFileSync(loc));
  } else {
    console.log("Created new cache file");
    const allUsers = await db.getGuildData(guildId);
    delete allUsers.config; //nobody cares about config

    //so I can use sort command for array
    let keys = Object.keys(allUsers);
    for (user of keys) {
      //[userId, points] or ['721377130755391578', 102]
      users.push([user, allUsers[user].points]);
    }
    users.sort((a, b) => b[1] - a[1]); //highest to lowest is b-a

    const json = JSON.stringify(users);
    fs.writeFileSync(loc, json);
  }

  return users;
}


/**
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
  await interaction.deferReply()
  const guildId = interaction.guildId;
  let limit = 10;
  const pointName = await db.readPointUnit(guildId);
  const users = await getUsers(db, guildId);

  //makes sure we only have the top whatever amount
  if (users.length < limit) limit = users.length;
  users.splice(limit);

  //get guildMember data and sort to get only user data(name mostly)
  let ids = users.map((user) => user[0]);
  let members = await interaction.guild.members.fetch({ user: ids, withPresences: true });
  let botRoles = await db.readGuildRoleConfig(guildId);
  let best = [];

  //add relevant information and keep order of peeps
  for (u of users) {
    const id = u[0];
    const points = u[1];
    const member = members.get(id);
    const roles = member._roles;
    const user = member.user;
    let bestRole = roleFromPt(botRoles, points)
    bestRole = await interaction.guild.roles.fetch(bestRole);

    //add whatever we need
    const info = {
      id,
      points,
      pointName,
      username: `${user.tag}`,
      displayName: `${member.displayName}`,
      avatar: user.avatarURL({ format: "png", size: 512 }),
      bestRole:
      {
        name: bestRole.name,
        color: bestRole.color
      }
    }
    best.push(info);
  }

  const pageLimit = 5;
  const pageCount = Math.ceil(best.length / 5);
  let pageIdx = 0;

  let img = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, pageIdx);


  const controls = new MessageActionRow().addComponents([
    new MessageButton().setCustomId(`${interaction.id}-first`).setDisabled(true).setLabel('⏮️').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`${interaction.id}-prev`).setLabel('⬅️').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`${interaction.id}-next`).setLabel('➡️').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`${interaction.id}-last`).setLabel('⏭️').setStyle('PRIMARY')
  ])

  interaction.client.on('interactionCreate', async (interactionBtn) => {
    if (!interactionBtn.isButton()) return;
    // console.log(JSON.stringify(interactionBtn))
    if (interactionBtn.customId == `${interaction.id}-next`) {
      pageIdx++;
      if (pageIdx > pageCount - 1) pageIdx = pageCount - 1
      img = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, pageIdx)
      interaction.editReply({ files: [img], components: [controls] });
    }
    if (interactionBtn.customId == `${interaction.id}-prev`) {
      pageIdx--;
      if (pageIdx < 0) pageIdx = 0
      img = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, pageIdx)
      interaction.editReply({ files: [img], components: [controls] });
    }
    if (interactionBtn.customId == `${interaction.id}-first`) {
      pageIdx = 0;
      img = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, pageIdx)
      interaction.editReply({ files: [img], components: [controls] });
    }
    if (interactionBtn.customId == `${interaction.id}-last`) {
      pageIdx = pageCount - 1;
      img = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, pageIdx)
      interaction.editReply({ files: [img], components: [controls] });
    }
  })

  interaction.editReply({ files: [img], components: [controls] });
}

/**
 * @param {String} hex
 */
function hexToGrayscale(hex) {
  const hexString = hex.substring(1)
  hex = parseInt(hexString, 16)

  const component = {}
  if (hexString.length == 3) {
    const mask = 0b1111
    component.r = (hex >> 8) & mask
    component.g = (hex >> 4) & mask
    component.b = hex & mask
  } else if (hexString.length == 6) {
    const mask = 0b1111_1111
    component.r = (hex >> 16) & mask
    component.g = (hex >> 8) & mask
    component.b = hex & mask
  } else {
    return 0
  }

  const grayScale = component.r * 0.3 + component.g * 0.59 + component.b * 0.11
  return Math.round(grayScale)
}

module.exports = {
  commandName: "leaderboard",

  execute
};
