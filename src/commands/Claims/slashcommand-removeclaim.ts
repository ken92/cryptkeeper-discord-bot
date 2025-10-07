import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';

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

export default new ApplicationCommand<ChatInputCommandInteraction>({
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
    const release = await claimLock.acquire();
    try {
      const guildId = interaction.guild?.id;
      if (!guildId) {
        await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
        return;
      }

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
        await interaction.reply({
          content: 'The selected user does not have a valid ID. (Try rerunning with @user syntax)',
          ephemeral: true
        });
        return;
      }

      console.log('Removing claim...');
      const trimmedPartnerName = partnerName.trim();
      const newClaims = (claims as any[]).filter(c => {
        const isMatchingUserId = userId ? (c.userid === userId || c.userId === userId) : true;
        const isMatchingPartnerName = String(c.partnername || '').toLowerCase() === trimmedPartnerName.toLowerCase();
        return !(isMatchingUserId && isMatchingPartnerName);
      });

      if (newClaims.length === claims.length) {
        await interaction.reply({
          content: 'No matching claims found to remove.',
          ephemeral: true
        });
        return;
      }

      client.database.set(`${guildId}-claims`, newClaims as never);

      await interaction.reply({
        content: `${claims.length - newClaims.length} claim(s) removed successfully.`
      });
    } finally {
      console.log('Claim removal process completed.');
      release();
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
