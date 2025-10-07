import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';

const command = new SlashCommandBuilder()
  .setName('setclaimlistchannel')
  .setDescription('Set ID of the claim list channel')
  .addStringOption(option =>
    option.setName('channelid')
      .setDescription('The claim list channel ID')
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
    const channelId = interaction.options.getString('channelid');
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    if (!channelId) {
      await interaction.reply({
        content: 'You must provide a channel ID.',
        ephemeral: true
      });
      return;
    }

    const cleanedChannelId = channelId.replace(/<#(\d+)>/, '$1');
    client.database.set(`${guildId}-claimListChannelId`, cleanedChannelId as never);

    await interaction.reply({
      content: 'Claim list channel set successfully.'
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
