const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const claimLock = require('../../utils/claimLock');

const command = new SlashCommandBuilder()
  .setName('addclaim')
  .setDescription('Add a partner claim')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user making the claim')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('partnername')
      .setDescription('The name of the partner to claim')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('partnersource')
      .setDescription('The partner\'s source')
      .setRequired(true))
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
      if (!user) {
        return await interaction.reply({
          content: 'You must provide a user to add a claim.',
          ephemeral: true
        });
      }
  
      const username = user.username;
      const userId = user.id;
      if (!username || !userId) {
        return await interaction.reply({
          content: 'The selected user does not have a valid username or ID.',
          ephemeral: true
        });
      }
  
      const partnername = interaction.options.getString('partnername');
      const partnersource = interaction.options.getString('partnersource');
      if (!partnername || !partnersource) {
        return await interaction.reply({
          content: 'You must provide both a partnername and partnersource to add a claim.',
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

      await interaction.deferReply();
      const claims = client.database.get(`${guildId}-claims`) || [];
      if (claims.some(c => c.partnername.toLowerCase() === partnername.trim().toLowerCase() && c.userId === userId)) {
        return await interaction.editReply({
          content: `A claim for this partner "${partnername.trim()}" and user "${username}" already exists.`,
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

      return await interaction.editReply({
        content: 'Claim added successfully.',
        ephemeral: true
      });
    } finally {
      release();
    }
  }
}).toJSON();