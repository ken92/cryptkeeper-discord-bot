import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction, Guild } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';

const command = new SlashCommandBuilder()
  .setName('removestaleclaims')
  .setDescription('Remove claims for users who have left the server')
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
      const guild: Guild | null = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
        return;
      }

      console.log('Checking for stale claims...');
      const claims: any[] = client.database.get(`${guild.id}-claims`) || [];

      // Collect claims grouped by userId and usernames seen for reporting
      const claimsByUserId: Record<string, string[]> = {};
      const usernamesByUserId: Record<string, Set<string>> = {};

      for (const claim of claims) {
        const uid = claim.userId;
        if (!uid) continue;

        if (!usernamesByUserId[uid]) usernamesByUserId[uid] = new Set();
        if (claim.username) usernamesByUserId[uid].add(String(claim.username));

        if (!claimsByUserId[uid]) claimsByUserId[uid] = [];
        if (claim.partnername) claimsByUserId[uid].push(String(claim.partnername));
      }

      const userIds = Object.keys(claimsByUserId);
      if (userIds.length === 0) {
        await interaction.reply({ content: 'No users found in the database.', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      // Ensure member cache is populated
      await guild.members.fetch();

      const missing: string[] = [];
      for (const userId of userIds) {
        if (!guild.members.cache.has(userId)) missing.push(userId);
      }

      if (missing.length === 0) {
        await interaction.editReply({ content: 'All users in the database are still in the server!' });
        return;
      }

      // Build human readable report
      const lines: string[] = missing.map(id => {
        const names = Array.from(usernamesByUserId[id] || []).join(', ') || 'unknown';
        const partners = (claimsByUserId[id] || []).join(', ') || 'none';
        return `${id} — names: ${names} — partners: ${partners}`;
      });

      const newClaims = (claims as any[]).filter(c => {
        return !missing.includes(c.userId);
      });
      client.database.set(`${guild.id}-claims`, newClaims as never);

      // Optionally remove claims here or return the list for manual inspection
      await interaction.editReply({
        content: `The following user IDs have left the server:\n${lines.join('\n')}`,
      });
    } finally {
      console.log('Removing stale claims complete.');
      release();
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
