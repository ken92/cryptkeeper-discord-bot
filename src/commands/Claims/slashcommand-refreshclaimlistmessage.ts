import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';

const command = new SlashCommandBuilder()
  .setName('refreshclaimlistmessagets')
  .setDescription('Refresh the claims list that the users can see')
  .addBooleanOption(option =>
    option.setName('one_sharing_status')
      .setDescription('Whether to display one sharing status or two (for romantic and platonic)')
      .setRequired(false))
  .toJSON();

const getClaimsChannel = async (guildId: string, client: DiscordBot): Promise<any | string> => {
  const channelId = client.database.get(`${guildId}-claimListChannelId`);
  if (!channelId) {
    return 'No channel set for the claim list.';
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased?.()) {
      return 'Channel not found or is not a text channel.';
    }
    return channel;
  } catch (err) {
    return 'Channel not found or is not a text channel.';
  }
};

const deleteExistingMessages = async (channel: any, messageIds: string[]) => {
  for (const messageId of messageIds) {
    try {
      const message = await channel.messages.fetch(messageId);
      if (message) await message.delete();
    } catch (error) {
      // ignore missing/deleted messages and log other errors
      console.error('Error deleting message:', error);
    }
  }
};

const sendNewMessages = async (
  guildId: string,
  client: DiscordBot,
  claims: any[],
  statusEmojis: Record<string, string>,
  oneSharingStatus: boolean
): Promise<true | string> => {
  const channel = await getClaimsChannel(guildId, client);
  if (typeof channel === 'string') {
    return channel;
  }

  const messageIds: string[] = [];
  for (const chunk of claimsListChunks(client, guildId, claims, statusEmojis, oneSharingStatus, 2000)) {
    const newMessage = await channel.send(chunk);
    messageIds.push(newMessage.id);
  }

  const keyMessage = await channel.send(`**__Guide__**
${statusEmojis.sharing} = Okay to share!
${statusEmojis.non_sharing} = Not okay to share!
${statusEmojis.selective} = Selective sharing!`);
  messageIds.push(keyMessage.id);

  client.database.set(`${guildId}-claimListMessageId`, JSON.stringify(messageIds) as never);
  return true;
};

function* claimsListChunks(
  client: DiscordBot,
  guildId: string,
  claims: any[],
  statusEmojis: Record<string, string>,
  oneSharingStatus: boolean,
  maxLength = 2000
): Generator<string, void, unknown> {
  // sort claims by partnername (case-insensitive)
  claims.sort((a: any, b: any) =>
    String(a.partnername).toLowerCase() > String(b.partnername).toLowerCase() ? 1 : -1
  );
  // persist sorted claims back to DB (keeps consistent order)
  client.database.set(`${guildId}-claims`, claims as never);

  let currentLetter = '';
  let currentChunk = '';

  for (const claim of claims) {
    const partnername = String(claim.partnername || '');
    let firstLetter = partnername.charAt(0).toUpperCase() || '';
    if (!/[A-Z]/.test(firstLetter)) {
      firstLetter = 'Non-Alphabetic';
    }

    let row = '';
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      row += `## ${currentLetter}\n`;
    }

    if (oneSharingStatus) {
      const status = claim.sharingstatus || claim.romantic_sharingstatus || claim.platonic_sharingstatus || '';
      row += `${statusEmojis[status] || ''} ${partnername} (${claim.partnersource || ''})\n`;
    } else {
      row += `**${partnername} (${claim.partnersource || ''})**\n`;
      row += `Romantic: ${statusEmojis[claim.romantic_sharingstatus] || ''} `;
      row += `Platonic: ${statusEmojis[claim.platonic_sharingstatus] || ''}\n\n`;
    }

    // if adding this row would exceed maxLength, yield current chunk first
    if ((currentChunk.length + row.length) > maxLength) {
      if (currentChunk) {
        yield currentChunk;
      }
      currentChunk = '';
    }
    currentChunk += row;
  }

  if (currentChunk) yield currentChunk;
}

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
    const guildId = interaction.guild?.id;
    if (!guildId) {
      return await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
    }

    const statusEmojis = (client.database.get(`${guildId}-statusEmojis`) || {}) as Record<string, string>;
    if (!statusEmojis.sharing || !statusEmojis.non_sharing || !statusEmojis.selective) {
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

    const oneSharingStatus = interaction.options.getBoolean('one_sharing_status') !== false;
    await interaction.deferReply();
    console.log('Refreshing claim list message...');

    const existingMessageIds = JSON.parse(client.database.get(`${guildId}-claimListMessageId`) || '[]');
    if (!existingMessageIds || existingMessageIds.length === 0) {
      const errorOrTrue = await sendNewMessages(guildId, client, claims, statusEmojis, oneSharingStatus);
      if (errorOrTrue !== true) {
        return await interaction.editReply({
          content: `Error sending new claim list message: ${errorOrTrue}`,
        });
      }
    } else {
      const channel = await getClaimsChannel(guildId, client);
      if (typeof channel === 'string') {
        return await interaction.editReply({
          content: `Error fetching claims channel: ${channel}`,
        });
      }
      try {
        await deleteExistingMessages(channel, existingMessageIds);
      } catch (error) {
        console.error('Error deleting existing claim list messages:', error);
      }
      const errorOrTrue = await sendNewMessages(guildId, client, claims, statusEmojis, oneSharingStatus);
      if (errorOrTrue !== true) {
        return await interaction.editReply({
          content: `Error sending new claim list message: ${errorOrTrue}`,
        });
      }
    }

    console.log('Refreshed claim list message.');
    return await interaction.editReply({
      content: 'Claim list message refreshed successfully.'
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
