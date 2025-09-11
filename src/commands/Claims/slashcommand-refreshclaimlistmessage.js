const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

const command = new SlashCommandBuilder()
  .setName('refreshclaimlistmessage')
  .setDescription('Refresh the claims list that the users can see')
  .addBooleanOption(option =>
    option.setName('one_sharing_status')
      .setDescription('Whether to display one sharing status or two (for romantic and platonic)')
      .setRequired(false))
  .toJSON();

const getClaimsChannel = async (guildId, client) => {
  const channelId = client.database.get(`${guildId}-claimListChannelId`);
  if (!channelId) {
    return 'No channel set for the claim list.';
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    return 'Channel not found or is not a text channel.';
  }
  return channel;
};

const sendNewMessage = async (guildId, client, claimsList) => {
  const channel = await getClaimsChannel(guildId, client);
  if (typeof channel === 'string') {
    return channel;
  }

  const newMessage = await channel.send(claimsList);
  client.database.set(`${guildId}-claimListMessageId`, newMessage.id);
  return true;
}

const getClaimsListString = (claimsList, statusEmojis, oneSharingStatus) => {
  if (!claimsList || claimsList.length === 0) {
    return 'No claims found.';
  }

  claimsList.sort((a, b) => a.partnername.toLowerCase() > b.partnername.toLowerCase() ? 1 : -1);
  let result = '';
  let currentLetter = '';

  for (const claim of claimsList) {
    let firstLetter = claim.partnername[0].toUpperCase();
    if (!/[A-Z]/.test(firstLetter)) {
      firstLetter = 'Non-Alphabetic';
    }

    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      result += `## ${currentLetter}\n`;
    }
    if (oneSharingStatus) {
      result += `${statusEmojis[claim.sharingstatus]} ${claim.partnername} (${claim.partnersource})\n`;
    } else {
      result += `**${claim.partnername} (${claim.partnersource})**\n`;
      result += `Romantic: ${statusEmojis[claim.romantic_sharingstatus]} `;
      result += `Platonic: ${statusEmojis[claim.platonic_sharingstatus]}\n\n`;
    }
  }
  return result;
};

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
    const guildId = interaction.guild.id;
    const {sharing, non_sharing, selective} = client.database.get(`${guildId}-statusEmojis`) || {};
    if (!sharing || !non_sharing || !selective) {
      return await interaction.reply({
        content: 'Please set emojis for all statuses using /setstatusemoji before refreshing the claim list message.',
        ephemeral: true
      });
    }

    const claims = client.database.get(`${guildId}-claims`) || [];
    if (claims.length === 0) {
      return await interaction.reply({
        content: 'No claims to display.',
        ephemeral: true
      });
    }

    const oneSharingStatus = interaction.options.getBoolean('one_sharing_status');
    const claimsList = getClaimsListString(claims, { sharing, non_sharing, selective }, oneSharingStatus !== false);

    const messageId = client.database.get(`${guildId}-claimListMessageId`);
    if (!messageId) {
      const errorOrTrue = await sendNewMessage(guildId, client, claimsList);
      if (errorOrTrue !== true) {
        return await interaction.reply({
          content: `Error sending new claim list message: ${errorOrTrue}`,
          ephemeral: true
        });
      }
    } else {
      const channel = await getClaimsChannel(guildId, client);
      if (typeof channel === 'string') {
        return await interaction.reply({
          content: `Error fetching claims channel: ${channel}`,
          ephemeral: true
        });
      }
      try {
        const existingMessage = await channel.messages.fetch(messageId);
        await existingMessage.edit(claimsList);
      } catch (error) {
        return await sendNewMessage(guildId, client, claimsList);
      }
    }

    return await interaction.reply({
      content: 'Claim list message refreshed successfully.'
    });
  }
}).toJSON();
