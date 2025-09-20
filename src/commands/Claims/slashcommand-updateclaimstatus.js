const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const claimLock = require('../../utils/claimLock');

const command = new SlashCommandBuilder()
  .setName('updateclaimstatus')
  .setDescription('Update the status of a partner claim')
  .addStringOption(option =>
    option.setName('partnername')
      .setDescription('The name of the claimed partner')
      .setRequired(false))
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user that made the claim')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('romantic_sharingstatus')
      .setDescription('The romantic sharing status of the partner')
      .setRequired(false)
      .addChoices(
        { name: 'Sharing', value: 'sharing' },
        { name: 'Non-sharing', value: 'non_sharing' },
        { name: 'Selective', value: 'selective' }
      ))
  .addStringOption(option =>
    option.setName('platonic_sharingstatus')
      .setDescription('The platonic sharing status of the partner')
      .setRequired(false)
      .addChoices(
        { name: 'Sharing', value: 'sharing' },
        { name: 'Non-sharing', value: 'non_sharing' },
        { name: 'Selective', value: 'selective' }
      ))
  .addStringOption(option =>
    option.setName('sharingstatus')
      .setDescription('The sharing status of the partner')
      .setRequired(false)
      .addChoices(
        { name: 'Sharing', value: 'sharing' },
        { name: 'Non-sharing', value: 'non_sharing' },
        { name: 'Selective', value: 'selective' }
      ))
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
      const user = interaction.options.getUser('user');
      const userId = user?.id;

      const partnername = interaction.options.getString('partnername');
      if (!partnername || !userId) {
        return await interaction.reply({
          content: 'You must provide a partnername or a user to update claims.',
          ephemeral: true
        });
      }
  
      const sharingstatus = interaction.options.getString('sharingstatus');
      const romantic_sharingstatus = interaction.options.getString('romantic_sharingstatus');
      const platonic_sharingstatus = interaction.options.getString('platonic_sharingstatus');
      if (!sharingstatus && !romantic_sharingstatus && !platonic_sharingstatus) {
        return await interaction.reply({
          content: 'You must provide at least one sharing status (sharingstatus, romantic_sharingstatus, or platonic_sharingstatus).',
          ephemeral: true
        });
      }

      let romanticStatus = romantic_sharingstatus;
      let platonicStatus = platonic_sharingstatus;
      if (sharingstatus) {
        romanticStatus = sharingstatus;
        platonicStatus = sharingstatus;
      }

      // TODO finish this
      const claims = client.database.get(`${guildId}-claims`) || [];
      const matchingClaims = claims.some(c =>
        c.partnername.toLowerCase() === partnername.trim().toLowerCase() && c.userId === userId
      );
      if (matchingClaims.length === 0) {
        return await interaction.reply({
          content: `Did not find any claims for partner "${partnername}"${userId ? ` by user <@${userId}>` : ''}.`,
          ephemeral: true
        });
      }
  
      claims.push({
        partnername: partnername.trim(),
        partnersource: partnersource.trim(),
        username,
        userId,
        sharingstatus: sharingstatus?.trim(),
        romantic_sharingstatus: romanticStatus?.trim(),
        platonic_sharingstatus: platonicStatus?.trim(),
        addedById: interaction.user.id,
        addedByUsername: `${interaction.user.username}#${interaction.user.discriminator}`,
        timestamp: Date.now(),
      });
      client.database.set(`${guildId}-claims`, claims);

      await interaction.reply({
        content: 'Claim added successfully.'
      });
    } finally {
      release();
    }
  }
}).toJSON();