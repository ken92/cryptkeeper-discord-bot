import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';

const command = new SlashCommandBuilder()
  .setName('addclaimlistmessage')
  .setDescription('Add an ID of which messages to use for the claim list')
  .addStringOption(option =>
    option.setName('messageid')
      .setDescription('The ID of the claim list message to add to the array of message IDs')
      .setRequired(true))
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
      const messageId = interaction.options.getString('messageid');
      const guildId = interaction.guild?.id;

      if (!messageId) {
        await interaction.reply({
          content: 'You must provide a message ID.',
          ephemeral: true
        });
        return;
      }

      if (!guildId) {
        await interaction.reply({
          content: 'This command must be used in a guild.',
          ephemeral: true
        });
        return;
      }

      const key = `${guildId}-claimListMessageId`;
      const existingMessageIds = JSON.parse(client.database.get(key) || '[]');
      existingMessageIds.push(messageId);
      client.database.set(key, JSON.stringify(existingMessageIds));

      await interaction.reply({
        content: 'Claim list message ID(s) set successfully.'
      });
    } finally {
      release();
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
