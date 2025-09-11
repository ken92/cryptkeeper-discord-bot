const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

const command = new SlashCommandBuilder()
  .setName('setclaimlistmessage')
  .setDescription('Set ID of the claim list message')
  .addStringOption(option =>
    option.setName('messageid')
      .setDescription('The ID of the claim list message')
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
    const messageId = interaction.options.getString('messageid');
    const guildId = interaction.guild.id;

    if (!messageId) {
      await interaction.reply({
        content: 'You must provide a message ID.',
        ephemeral: true
      });
      return;
    }
    client.database.set(`${guildId}-claimListMessageId`, messageId);

    await interaction.reply({
      content: 'Claim list message ID set successfully.'
    });
  }
}).toJSON();
