const { Client, Intents } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("./database");
const PointsManager = require("./points-manager");
const handleMessage = require("./handle-msg");
const commands = require("./load-commands");
const { loadFonts } = require("./rank-card");

require("dotenv").config();
if (!process.env.FIREBASE_CREDENTIALS) {
    process.env.FIREBASE_CREDENTIALS = fs.readFileSync(process.env.FIREBASE_CREDENTIALS_PATH);
}
if (!process.env.POINT_UNIT) process.env.POINT_UNIT = "points";
if (!process.NO_REGISTER_FONTS) {
    loadFonts();
}

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_PRESENCES]
});

const db = new Database();
const pointsManager = new PointsManager(db);
pointsManager.startPointUpdationLoop(10 * 1000);

/* */
client.once("ready", (c) => {
    console.log(`Ready! Logged in as Gio the best!` /*${c.user.tag}*/);
});

client.on("interactionCreate", (interaction) => {
    let { commandName } = interaction;
    console.log(commandName);
    if (Object.keys(commands).includes(commandName)) {
        try {
            commands[commandName](interaction, db);
        } catch (e) {
            interaction.reply({
                content: "Uh oh, something went wrong during the command execution :(",
                ephemeral: true
            });
            console.error(e);
        }
    } else {
        console.log(`Unknown command: ${commandName}`);
    }
});

client.on("messageCreate", async (msg) => {
    try {
        handleMessage(msg, db, pointsManager);
    } catch (e) {
        let channelId = await db.readMessagingChannel(msg.guildId);
        let channel;
        if (channelId) {
            channel = await msg.guild.channels.fetch(channelId);
        }
        if (!channel) channel = msg.channel;
        channel.send(`An error occured while handling a message: ${e}`);
    }
});

client.login(process.env.TOKEN);
