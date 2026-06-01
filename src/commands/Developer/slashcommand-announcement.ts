import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';

const command = new SlashCommandBuilder()
  .setName('announcement')
  .setDescription("Send an announcement to every server's claims channel (can only be used by the bot owner)")
  .addStringOption(option =>
    option.setName('message')
      .setDescription('The announcement text to send (supports multiple lines)')
      .setRequired(true))
  .toJSON();

export default new ApplicationCommand<ChatInputCommandInteraction>({
  command,
  options: {
    cooldown: 1000,
    botOwner: true
  },
  run: async (client: DiscordBot, interaction: ChatInputCommandInteraction) => {
    const announcement = interaction.options.getString('message', true);

    await interaction.deferReply({ ephemeral: true });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const [guildId] of client.guilds.cache) {
      const channelId = client.database.get(`${guildId}-claimListChannelId`);
      if (!channelId) {
        skipped++;
        continue;
      }

      try {
        const channel = await client.channels.fetch(String(channelId));
        if (!channel || !channel.isTextBased?.()) {
          skipped++;
          continue;
        }

        const textChannel = channel as any;
        await textChannel.send(announcement);
        sent++;
      } catch (err) {
        console.error(`Failed to send announcement to guild ${guildId}:`, err);
        failed++;
      }
    }

    return interaction.editReply({ content: `Announcement results — sent: ${sent}, failed: ${failed}, skipped (no channel): ${skipped}.` });
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
