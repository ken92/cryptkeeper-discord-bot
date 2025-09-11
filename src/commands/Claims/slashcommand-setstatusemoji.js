const { SlashCommandBuilder } = require('discord.js');
const DiscordBot = require('../../client/DiscordBot');
const ApplicationCommand = require('../../structure/ApplicationCommand');

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
  );

module.exports = new ApplicationCommand({
  command,
  options: {
    cooldown: 1000
  },
  /**
   * @param {DiscordBot} client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  run: async (client, interaction) => {
    const status = interaction.options.getString('status');
    const emoji = interaction.options.getString('emoji');
    const guildId = interaction.guild.id;

    if (!status || !emoji) {
      await interaction.reply({
        content: 'You must provide both a status and an emoji.',
        ephemeral: true
      });
      return;
    }

    const emojiMap = client.database.get(`${guildId}-statusEmojis`) || {};
    emojiMap[status] = emoji;
    client.database.set(`${guildId}-statusEmojis`, emojiMap);

    await interaction.reply({
      content: `Emoji for status "${status}" set to: ${emoji}`,
      ephemeral: true
    });
  }
}).toJSON();
