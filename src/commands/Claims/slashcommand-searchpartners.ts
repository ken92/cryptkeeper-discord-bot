import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';

const command = new SlashCommandBuilder()
  .setName('searchpartners')
  .setDescription('Search the claims list')
  .addStringOption(option =>
    option.setName('username')
      .setDescription('The username of the person that requested the partner')
      .setRequired(false))
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user that requested the partner (@user notation)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('userid')
      .setDescription('The user ID of the person that requested the partner')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('partnername')
      .setDescription('The name of the partner')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('partnersource')
      .setDescription("The partner's source")
      .setRequired(false))
  .toJSON();

export default new ApplicationCommand<ChatInputCommandInteraction>({
  command,
  options: {
    cooldown: 1000
  },
  run: async (client: DiscordBot, interaction: ChatInputCommandInteraction) => {
    const guildId = interaction.guild?.id;
    if (!guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    const claims: any[] = client.database.get(`${guildId}-claims`) || [];
    const username = interaction.options.getString('username') || null;
    const userId = interaction.options.getString('userid') || null;
    const user = interaction.options.getUser('user') || null;
    const partnerName = interaction.options.getString('partnername') || null;
    const partnerSource = interaction.options.getString('partnersource') || null;

    if (!username && !partnerName && !partnerSource && !user && !userId) {
      await interaction.reply({
        content: 'You must provide at least one search criteria (username, user, user ID, partner name, or partner source).',
        ephemeral: true
      });
      return;
    }

    const usernameFromId = userId ? (await client.users.fetch(userId).catch(() => null))?.username ?? null : null;
    const usernameFromUser = user ? user.username : null;
    const finalUsername = usernameFromId || usernameFromUser || username;
    const cleanedUsername = finalUsername ? finalUsername.replace(/<@!?(\d+)>/, '$1') : null;
    const trimmedUsername = cleanedUsername ? cleanedUsername.trim().toLowerCase() : null;

    const trimmedPartnerName = partnerName ? partnerName.trim().toLowerCase() : null;
    const trimmedPartnerSource = partnerSource ? partnerSource.trim().toLowerCase() : null;

    const filteredClaims = claims.filter(c => {
      const claimUsername = c.username ? String(c.username).toLowerCase() : '';
      const claimPartnerName = c.partnername ? String(c.partnername).toLowerCase() : '';
      const claimPartnerSource = c.partnersource ? String(c.partnersource).toLowerCase() : '';

      const isMatchingUsername = trimmedUsername ? claimUsername === trimmedUsername : true;
      const isMatchingPartnerName = trimmedPartnerName ? claimPartnerName.includes(trimmedPartnerName) : true;
      const isMatchingPartnerSource = trimmedPartnerSource ? claimPartnerSource.includes(trimmedPartnerSource) : true;
      return isMatchingUsername && isMatchingPartnerName && isMatchingPartnerSource;
    });

    if (filteredClaims.length === 0) {
      await interaction.reply({
        content: 'No claims found matching the provided criteria.',
        ephemeral: true
      });
      return;
    }

    const statusEmojis = client.database.get(`${guildId}-statusEmojis`) || {};

    let response = 'Found the following claims:\n';
    for (const claim of filteredClaims) {
      const statuses = [
        claim.sharingstatus ? `  Status: ${claim.sharingstatus} ${statusEmojis[claim.sharingstatus] || ''}` : null,
        claim.romantic_sharingstatus ? `  Romantic: ${claim.romantic_sharingstatus} ${statusEmojis[claim.romantic_sharingstatus] || ''}` : null,
        claim.platonic_sharingstatus ? `  Platonic: ${claim.platonic_sharingstatus} ${statusEmojis[claim.platonic_sharingstatus] || ''}` : null
      ].filter(Boolean).join('\n');
      response += `- Partner: ${claim.partnername} (${claim.partnersource}), Claimed by: ${claim.username}\n${statuses}\n`;
    }

    await interaction.reply({
      content: response,
      ephemeral: true
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
