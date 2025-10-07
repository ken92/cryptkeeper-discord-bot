import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction, User } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';

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

export default new ApplicationCommand<ChatInputCommandInteraction>({
  command,
  options: {
    cooldown: 1000
  },
  run: async (client: DiscordBot, interaction: ChatInputCommandInteraction) => {
    const release = await claimLock.acquire();
    try {
      const guildId = interaction.guild?.id;
      if (!guildId) {
        await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
        return;
      }

      const user: User | null = interaction.options.getUser('user');
      const userId = user?.id ?? null;

      const partnername = interaction.options.getString('partnername')?.trim() ?? null;
      if (!partnername && !userId) {
        await interaction.reply({
          content: 'You must provide a partner name or a user to update claims.',
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

      // If a general sharingstatus was provided, apply to both romantic and platonic unless specific values provided
      let romanticStatus = romantic_sharingstatus;
      let platonicStatus = platonic_sharingstatus;
      if (sharingstatus) {
        if (!romanticStatus) romanticStatus = sharingstatus;
        if (!platonicStatus) platonicStatus = sharingstatus;
      }

      const claimsKey = `${guildId}-claims`;
      const claims: any[] = client.database.get(claimsKey) || [];

      const normalizedPartner = partnername ? partnername.toLowerCase() : null;

      // find matching claims (filter by partnername if provided, and by userId if provided)
      const matchedIndexes: number[] = [];
      for (let i = 0; i < claims.length; i++) {
        const c = claims[i];
        const matchesPartner = normalizedPartner ? String(c.partnername || '').toLowerCase() === normalizedPartner : true;
        const matchesUser = userId ? String(c.userId || c.userid || '') === userId : true;
        if (matchesPartner && matchesUser) matchedIndexes.push(i);
      }

      if (matchedIndexes.length === 0) {
        await interaction.reply({
          content: `Did not find any claims for partner "${partnername ?? 'any'}"${userId ? ` by user <@${userId}>` : ''}.`,
          ephemeral: true
        });
        return;
      }

      // update matched claims
      for (const idx of matchedIndexes) {
        const claim = claims[idx];
        if (sharingstatus) claim.sharingstatus = sharingstatus.trim();
        if (romanticStatus) claim.romantic_sharingstatus = romanticStatus.trim();
        if (platonicStatus) claim.platonic_sharingstatus = platonicStatus.trim();
        // update lastEdited metadata
        claim.lastEditedById = interaction.user.id;
        claim.lastEditedByUsername = `${interaction.user.username}#${(interaction.user as any).discriminator || ''}`;
        claim.lastEditedTimestamp = Date.now();
      }

      client.database.set(claimsKey, claims);

      await interaction.reply({
        content: `${matchedIndexes.length} claim(s) updated successfully.`
      });
    } finally {
      release();
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
