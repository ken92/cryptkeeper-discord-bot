const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const claimLock = require('../../utils/claimLock');

const command = new SlashCommandBuilder()
  .setName('removeclaim')
  .setDescription('Remove a partner claim')
  .addStringOption(option =>
    option.setName('username')
      .setDescription('The username of the person who requested the claim')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('partnername')
      .setDescription('The name of the partner that was claimed')
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
      const username = interaction.options.getString('username');
      const partnerName = interaction.options.getString('partnername');
  
      if (!partnerName) {
        await interaction.reply({
          content: 'You must provide a partner name to remove a claim.',
          ephemeral: true
        });
        return;
      }
  
      const trimmedUsername = username ? username.trim() : null;
      const trimmedPartnerName = partnerName.trim();
  
      const newClaims = claims.filter(c => {
        const isMatchingUsername = trimmedUsername ? c.username.toLowerCase() === trimmedUsername.toLowerCase() : true;
        const isMatchingPartnerName = c.partnername.toLowerCase() === trimmedPartnerName.toLowerCase();
        return !(isMatchingUsername && isMatchingPartnerName);
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
      release();
    }
  }
}).toJSON();