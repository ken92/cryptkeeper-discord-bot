const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

const command = new SlashCommandBuilder()
  .setName('addclaimlistmessage')
  .setDescription('Add an ID of which messages to use for the claim list')
  .addStringOption(option =>
    option.setName('messageid')
      .setDescription('The ID of the claim list message to add to the array of message IDs')
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
    const release = await claimLock.acquire();
    try {
      const messageId = interaction.options.getString('messageid');
      const guildId = interaction.guild.id;
  
      if (!messageId) {
        await interaction.reply({
          content: 'You must provide a message ID.',
          ephemeral: true
        });
        return;
      }
      const existingMessageIds = JSON.parse(client.database.get(`${guildId}-claimListMessageId`) || '[]');
      existingMessageIds.push(messageId);
      client.database.set(`${guildId}-claimListMessageId`, JSON.stringify(existingMessageIds));

      await interaction.reply({
        content: 'Claim list message ID(s) set successfully.'
      });
    } finally {
      release();
    }
  }
}).toJSON();
