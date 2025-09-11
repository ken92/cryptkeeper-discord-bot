const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

const command = new SlashCommandBuilder()
  .setName('setclaimlistchannel')
  .setDescription('Set ID of the claim list channel')
  .addStringOption(option =>
    option.setName('channelid')
      .setDescription('The claim list channel ID')
      .setRequired(true))
  .toJSON();

module.exports = new ApplicationCommand({
  command,
  options: {
    cooldown: 1000
  },
  /**
   * 
   * @param {DiscordBot} client 
   * @param {ChatInputCommandInteraction} interaction 
   */
  run: async (client, interaction) => {
    const channelId = interaction.options.getString('channelid');
    const guildId = interaction.guild.id;

    if (!channelId) {
      await interaction.reply({
        content: 'You must provide a channel ID.',
        ephemeral: true
      });
      return;
    }
    const cleanedChannelId = channelId.replace(/<#(\d+)>/, '$1');
    client.database.set(`${guildId}-claimListChannelId`, cleanedChannelId);

    await interaction.reply({
      content: 'Claim list channel set successfully.'
    });
  }
}).toJSON();
