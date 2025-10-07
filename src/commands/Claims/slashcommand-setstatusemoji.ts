import type DiscordBot from '../../client/DiscordBot';
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';

const command = new SlashCommandBuilder()
  .setName('setstatusemoji')
  .setDescription('Set the emoji for a specific status')
  .addStringOption(option =>
    option.setName('status')
      .setDescription('The status to set the emoji for (e.g., Sharing, Non-Sharing, Selective)')
      .setRequired(true)
      .addChoices(
        { name: 'Sharing', value: 'sharing' },
        { name: 'Non-Sharing', value: 'non_sharing' },
        { name: 'Selective', value: 'selective' }
      )
  )
  .addStringOption(option =>
    option.setName('emoji')
      .setDescription('The emoji to use for this status (Unicode or custom emoji)')
      .setRequired(true)
  )
  .toJSON();

export default new ApplicationCommand<ChatInputCommandInteraction>({
  command,
  options: {
    cooldown: 1000
  },
  run: async (client: DiscordBot, interaction: ChatInputCommandInteraction) => {
    const status = interaction.options.getString('status');
    const emoji = interaction.options.getString('emoji');
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.reply({
        content: 'This command must be used in a guild.',
        ephemeral: true
      });
      return;
    }

    if (!status || !emoji) {
      await interaction.reply({
        content: 'You must provide both a status and an emoji.',
        ephemeral: true
      });
      return;
    }

    const emojiMap = (client.database.get(`${guildId}-statusEmojis`) || {}) as Record<string, string>;
    emojiMap[status] = emoji;
    client.database.set(`${guildId}-statusEmojis`, emojiMap as never);

    await interaction.reply({
      content: `Emoji for status "${status}" set to: ${emoji}`,
      ephemeral: true
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
