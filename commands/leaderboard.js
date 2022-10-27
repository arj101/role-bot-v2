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

const canvas = createCanvas(1516, 5 * 291 + 6 * 28)
const ctx = canvas.getContext("2d")
const bgGradients = new Map()

const formatter = Intl.NumberFormat('en', { 'notation': 'compact' })

async function drawLeaderboard(best, pointUnit, pageLimit = 5, pageIdx = 0) {
  const timeStart = new Date().getTime();
  const height = 291;
  const spacing = 28;

  const page = best.slice(pageIdx * pageLimit, (pageIdx + 1) * pageLimit)
  const idxOffset = pageIdx * pageLimit;

  canvas.height = page.length > 0 ?
    (height + spacing) * page.length + spacing
    : height + 2 * spacing;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  let bgGradient;
  if (bgGradients.has(canvasHeight)) bgGradient = bgGradients.get(canvasHeight)
  else {
    bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    bgGradient.addColorStop(0, "rgba(126, 88, 143, 1)");
    bgGradient.addColorStop(1, "rgba(36, 115, 175, 1)");
    bgGradients.set(canvasHeight, bgGradient)
  }
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
    const rankText = String(idxOffset + i + 1)
    await renderEmojiText(ctx, rankText, { x: xoff + 165 - ctx.measureText(rankText).width / 2, y: yoff + height / 2 - ctx.textHeight(rankText) }, 120, 120);


    //points
    ctx.font = "80px Poppins Bold";
    const pointsText = formatter.format(page[i].points)
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

  console.log(`Rendered leaderboard in ${new Date().getTime() - timeStart}ms`)
  return canvas.toBuffer();
}


async function getUsers(db, guildId) {
  const loc = path.join(__dirname, "..", "leaderboards", `${guildId}.json`);
  const maxCacheTime = 30 * 60 * 1000; //30min

  //check file creation date
  let creationTime = 0;
  if (fs.existsSync(loc)) creationTime = fs.statSync(loc).ctimeMs;

  let users = [];

  let diff = new Date().getTime() - Math.floor(creationTime);
  //checks if current time is less than cacheTime
  if (diff < maxCacheTime) {
    console.log("Got cached leaderboard");
    users = JSON.parse(fs.readFileSync(loc));
  } else {
    console.log("Created new cache file");
    const allUsers = await db.getGuildData(guildId);
    delete allUsers.config; //nobody cares about config

    //so I can use sort command for array
    let keys = Object.keys(allUsers);
    for (const user of keys) {
      //[userId, points] or ['721377130755391578', 102]
      users.push([user, allUsers[user].points]);
    }
    users.sort((a, b) => b[1] - a[1]); //highest to lowest is b-a

    const json = JSON.stringify(users);
    fs.writeFile(loc, json, 'utf8', () => console.log(`Successfully wrote leaderboard of guild ${guildId}`));
  }

  return users;
}


/**
 * @param {CommandInteraction} interaction
 * @param {Database} db
 */
async function execute(interaction, db) {
  await interaction.reply("Crunching the numbers... https://media.giphy.com/media/zPbnEgxsPJOJSD3qfr/giphy.gif");
  const guildId = interaction.guildId;
  let limit = 100;
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
    if (!member) continue;
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

  const pages = {}
  pages[pageIdx] = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, pageIdx)

  const controls = new MessageActionRow().addComponents([
    new MessageButton().setCustomId(`first`).setDisabled(true).setEmoji('997491568741195876').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`prev`).setDisabled(true).setEmoji('997492116030758952').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`next`).setEmoji('997492118949990400').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`last`).setEmoji('997492121172983920').setStyle('PRIMARY')
  ])

  if (pageCount <= 1) {
    controls.components.at(2).setDisabled(true)
    controls.components.at(3).setDisabled(true)
  }

  /**
   * @param {DiscordCommandInteraction} i
   */
  const filter = i => {
    return (
      controls.components.filter(c => c.customId == i.customId).length == 1 &&
      i.user.id === interaction.user.id
    )
  }

  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });
  collector.on('collect', async i => {

    try { await i.deferUpdate(); } catch (e) { }


    let newIdx = pageIdx;
    switch (i.customId) {
      case 'first': newIdx = 0;
        controls.components.forEach(c => c.setDisabled(false))
        controls.components.at(0).setDisabled(true);
        controls.components.at(1).setDisabled(true);
        break;
      case 'prev': newIdx--;
        controls.components.forEach(c => c.setDisabled(false))
        if (newIdx <= 0) {
          newIdx = 0
          controls.components.at(0).setDisabled(true);
          controls.components.at(1).setDisabled(true);
        };
        break;
      case 'next': newIdx++;
        controls.components.forEach(c => c.setDisabled(false))
        if (newIdx >= pageCount - 1) {
          newIdx = pageCount - 1
          controls.components.at(2).setDisabled(true);
          controls.components.at(3).setDisabled(true);
        };
        break;
      case 'last':
        controls.components.forEach(c => c.setDisabled(false))
        newIdx = pageCount - 1
        controls.components.at(2).setDisabled(true);
        controls.components.at(3).setDisabled(true);
        break;
    }
    if (newIdx != pageIdx) {
      try { await i.editReply({ content: `Hold on... (rendering page ${newIdx + 1}) https://media.giphy.com/media/sCeDVONTypmVy/giphy.gif`, files: [], controls: [] }) } catch (e) { }
      if (!pages[newIdx])
        pages[newIdx] = await drawLeaderboard(best, await db.readPointUnit(interaction.guildId), pageLimit, newIdx);

      pageIdx = newIdx;
    }


    try { i.editReply({ content: `Page ${pageIdx + 1}/${pageCount}`, files: [pages[pageIdx]], components: [controls] }) } catch (e) {
      i.channel.send('ERROR REEEEEE')
    }
  });
  await interaction.editReply({ content: `Page ${pageIdx + 1}/${pageCount}`, files: [pages[pageIdx]], components: [controls] });

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
