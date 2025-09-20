const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const claimLock = require('../../utils/claimLock');

const command = new SlashCommandBuilder()
  .setName('removestaleclaims')
  .setDescription('Remove claims for users who have left the server')
  .toJSON();

module.exports = new ApplicationCommand({
  command,
  options: {
    cooldown: 1000
  },
  /**
   * 
   * @param {DiscordBot} client 
   * @param {ChatInputCommandInteraction} interaction 
   */
  run: async (client, interaction) => {
    const release = await claimLock.acquire();
    try {
      console.log('Checking for stale claims...');
      const guild = interaction.guild;
      const claims = client.database.get(`${guild.id}-claims`) || [];

      // Collect all user info from claims
      const claimsByUserId = {};
      const usernamesByUserId = {};
      for (const claim of claims) {
        if (claim.userId) {
          if (usernamesByUserId[claim.userId]) {
            usernamesByUserId[claim.userId].add(claim.username);
          } else {
            usernamesByUserId[claim.userId] = new Set([claim.username]);
          }

          if (claimsByUserId[claim.userId]) {
            claimsByUserId[claim.userId].push(claim.partnername);
          } else {
            claimsByUserId[claim.userId] = [claim.partnername];
          }
        }
      }

      const userIds = Object.keys(claimsByUserId);
      if (userIds.length === 0) {
        return await interaction.reply({ content: 'No users found in the database.', ephemeral: true });
      }
      await interaction.deferReply();

      await guild.members.fetch();
      const missing = [];
      for (const userId of userIds) {
        if (!guild.members.cache.has(userId)) {
          missing.push(userId);
        }
      }

      if (missing.length === 0) {
        return await interaction.editReply({ content: 'All users in the database are still in the server!', ephemeral: true });
      }

      // TODO finish the new username and user ID string output
      // const 
      return await interaction.editReply({
        content: `The following user IDs have left the server:\n${missing.join('\n')}`,
        ephemeral: true
      });
    } finally {
      console.log('Removing stale claims complete.');
      release();
    }
  }
}).toJSON();
