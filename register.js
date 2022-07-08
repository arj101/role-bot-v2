const { REST } = require("@discordjs/rest");
const { Routes, ChannelType } = require("discord-api-types/v9");
const { Permissions } = require("discord.js");
const fs = require("node:fs");
require("dotenv").config();
const { SlashCommandBuilder } = require("@discordjs/builders");

// Place your client and guild ids here
const clientId = "842033653734703135";
const guildId = "856933597767008286";

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Replies with pong! (e)").toJSON(),
  new SlashCommandBuilder().setName("nothing").setDescription("Does nothing").toJSON(),
  new SlashCommandBuilder()
    .setName("points")
    .setDescription("EEEE")
    .addUserOption((option) => option.setName("member").setDescription("See someone else's points").setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("change-role")
    .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_ROLES)
    .setDescription("Adds or removes a role from the ranking system")
    .addRoleOption((option) => option.setName("role").setDescription("Role to add or remove").setRequired(true))
    .addNumberOption((option) => option.setName("points").setDescription("Number of points in the case of adding a new role").setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("messaging-channel")
    .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_CHANNELS)
    .setDescription("Set the channel to send level up messages")
    .addChannelOption((option) => {
      option.setName("channel").setDescription("channel").setRequired(true);
      option.channel_types = ChannelType.GuildText;
      return option;
    })
    .toJSON(),
  new SlashCommandBuilder()
    .setName("reload")
    .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR)
    .setDescription("Clears database cache")
    .toJSON(),
  new SlashCommandBuilder().setName("roles").setDescription("See all available roles").toJSON(),
  new SlashCommandBuilder().setName("point-unit").setDescription("Sets point unit.")
    .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR)
    .addStringOption(option => option.setName("unit").setDescription("The unit").setRequired(true))
];
console.error("Gio is too sexy for this bot :(");

const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
