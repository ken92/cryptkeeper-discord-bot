import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction, User } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';

const command = new SlashCommandBuilder()
  .setName('addclaimts')
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
      .setDescription("The partner's source")
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

export default new ApplicationCommand({
  command,
  options: {
    cooldown: 1000
  },
  /**
   * 
   * @param {DiscordBot} client 
   * @param {ChatInputCommandInteraction} interaction 
   */
  run: async (client: DiscordBot, interaction: ChatInputCommandInteraction) => {
    // async-mutex Mutex.acquire() returns a release function
    const release = await claimLock.acquire();
    const guildId = interaction.guild?.id;
    if (!guildId) {
      try {
        await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      } finally {
        release();
      }
      return;
    }

    try {
      const user: User | null = interaction.options.getUser('user');
      if (!user) {
        await interaction.reply({
          content: 'You must provide a user to add a claim.',
          ephemeral: true
        });
        return;
      }

      const username = user.username;
      const userId = user.id;
      if (!username || !userId) {
        await interaction.reply({
          content: 'The selected user does not have a valid username or ID.',
          ephemeral: true
        });
        return;
      }

      const partnername = interaction.options.getString('partnername');
      const partnersource = interaction.options.getString('partnersource');
      if (!partnername || !partnersource) {
        await interaction.reply({
          content: 'You must provide both a partnername and partnersource to add a claim.',
          ephemeral: true
        });
        return;
      }

      const sharingstatus = interaction.options.getString('sharingstatus') ?? null;
      const romantic_sharingstatus = interaction.options.getString('romantic_sharingstatus') ?? null;
      const platonic_sharingstatus = interaction.options.getString('platonic_sharingstatus') ?? null;

      if (!sharingstatus && !romantic_sharingstatus && !platonic_sharingstatus) {
        await interaction.reply({
          content: 'You must provide at least one sharing status (sharingstatus, romantic_sharingstatus, or platonic_sharingstatus).',
          ephemeral: true
        });
        return;
      }

      let romanticStatus = romantic_sharingstatus;
      let platonicStatus = platonic_sharingstatus;
      if (sharingstatus) {
        romanticStatus = sharingstatus;
        platonicStatus = sharingstatus;
      }

      await interaction.deferReply();

      const claimsKey = `${guildId}-claims`;
      const claims: any[] = client.database.get(claimsKey) || [];

      const partnerLower = partnername.trim().toLowerCase();
      if (claims.some(c => (c.partnername?.toLowerCase?.() === partnerLower) && c.userId === userId)) {
        await interaction.editReply({
          content: `A claim for this partner "${partnername.trim()}" and user "${username}" already exists.`,
        });
        return;
      }

      claims.push({
        partnername: partnername.trim(),
        partnersource: partnersource.trim(),
        username,
        userId,
        sharingstatus: sharingstatus?.trim() ?? null,
        romantic_sharingstatus: romanticStatus?.trim() ?? null,
        platonic_sharingstatus: platonicStatus?.trim() ?? null,
        addedById: interaction.user.id,
        addedByUsername: `${interaction.user.username}#${(interaction.user as any).discriminator || ''}`,
        timestamp: Date.now(),
      });

      client.database.set(claimsKey, claims);

      await interaction.editReply({
        content: 'Claim added successfully.',
      });
    } finally {
      release();
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
