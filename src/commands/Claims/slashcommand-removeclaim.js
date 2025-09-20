const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const claimLock = require('../../utils/claimLock');

const command = new SlashCommandBuilder()
  .setName('removeclaim')
  .setDescription('Remove a partner claim')
  .addStringOption(option =>
    option.setName('partnername')
      .setDescription('The name of the partner that was claimed')
      .setRequired(true))
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user who made the claim')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('userid')
      .setDescription('The ID of the user who made the claim')
      .setRequired(false))
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
    const guildId = interaction.guild.id;
    try {
      const claims = client.database.get(`${guildId}-claims`) || [];
      const partnerName = interaction.options.getString('partnername');

      if (!partnerName) {
        await interaction.reply({
          content: 'You must provide a partner name to remove a claim.',
          ephemeral: true
        });
        return;
      }

      const user = interaction.options.getUser('user');
      const inputUserId = interaction.options.getString('userid');
      const userId = (user?.id || inputUserId)?.trim();
      if (user && !userId) {
        return await interaction.reply({
          content: 'The selected user does not have a valid ID. (Try rerunning with @user syntax)',
          ephemeral: true
        });
      }
  
      console.log('Removing claim...');
      const trimmedPartnerName = partnerName.trim();
      const newClaims = claims.filter(c => {
        const isMatchingUserId = userId ? c.userid === userId : true;
        const isMatchingPartnerName = c.partnername.toLowerCase() === trimmedPartnerName.toLowerCase();
        return !(isMatchingUserId && isMatchingPartnerName);
      });
      if (newClaims.length === claims.length) {
        await interaction.reply({
          content: 'No matching claims found to remove.',
          ephemeral: true
        });
        return;
      }
      client.database.set(`${guildId}-claims`, newClaims);

      await interaction.reply({
        content: `${claims.length - newClaims.length} claim(s) removed successfully.`
      });
    } finally {
      console.log('Claim removal process completed.');
      release();
    }
  }
}).toJSON();