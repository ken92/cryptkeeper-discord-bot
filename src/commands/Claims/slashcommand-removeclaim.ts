import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction, Message, ButtonInteraction } from 'discord.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';

const command = new SlashCommandBuilder()
  .setName('removeclaimtest')
  .setDescription('Remove a partner claim')
  .addStringOption(option =>
    option.setName('username')
      .setDescription('The username of the person that requested the partner')
      .setRequired(false))
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user that requested the partner (@user notation)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('userid')
      .setDescription('The user ID of the person that requested the partner')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('partnername')
      .setDescription('The name of the partner')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('partnersource')
      .setDescription("The partner's source")
      .setRequired(false))
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
      const guildId = interaction.guild?.id;
      if (!guildId) {
        await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
        return;
      }

      const claims = client.database.get(`${guildId}-claims`) || [];
      const partnerName = interaction.options.getString('partnername');

      if (!partnerName) {
        await interaction.reply({
          content: 'You must provide a partner name to remove a claim.',
          ephemeral: true
        });
        return;
      }

      const user = interaction.options.getUser('user');
      const inputUserId = interaction.options.getString('userid');
      const userId = (user?.id || inputUserId)?.trim();

      if (user && !userId) {
        await interaction.reply({
          content: 'The selected user does not have a valid ID. (Try rerunning with @user syntax)',
          ephemeral: true
        });
        return;
      }

      console.log('Preparing to remove claim...');
      const trimmedPartnerName = partnerName.trim();
      const removedClaims: any[] = [];
      const newClaims = (claims as any[]).filter(c => {
        const isMatchingUserId = userId ? (String(c.userid) === userId || String(c.userId) === userId) : true;
        const isMatchingPartnerName = String(c.partnername || '').toLowerCase() === trimmedPartnerName.toLowerCase();
        if (isMatchingUserId && isMatchingPartnerName) {
          removedClaims.push(c);
        }
        return !(isMatchingUserId && isMatchingPartnerName);
      });

      const removedCount = claims.length - newClaims.length;
      if (removedCount === 0) {
        await interaction.reply({
          content: 'No matching claims found to remove.',
          ephemeral: true
        });
        return;
      }

      // Ask for confirmation using buttons, wait for the invoking user to respond
      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('confirm_remove').setLabel('Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_remove').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      // send ephemeral confirmation and fetch the reply so we can collect interactions
      const prompt = (await interaction.reply({
        content: `Are you sure you want to remove ${removedCount} claim(s)?\n${removedClaims.map(c => `- Partner: ${c.partnername}, Requested by: ${c.username || c.userId || c.userid}`).join('\n')}`,
        // builders/JSON output don't line up perfectly with the InteractionReplyOptions types;
        // cast to any to satisfy the compiler while keeping runtime correctness.
        components: [confirmRow.toJSON() as unknown as any],
        ephemeral: true,
        fetchReply: true
      })) as Message<boolean>;

      // wait for button press from the same user, timeout 15s
      const result = await new Promise<'confirm' | 'cancel' | 'timeout'>((resolve) => {
        const collector = prompt.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          max: 1,
          time: 15000
        });

        collector.on('collect', async (i: ButtonInteraction) => {
          try {
            await i.deferUpdate();
          } catch {}
          if (i.customId === 'confirm_remove') resolve('confirm');
          else resolve('cancel');
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) resolve('timeout');
        });
      });

      // handle result
      if (result === 'confirm') {
        client.database.set(`${guildId}-claims`, newClaims as never);
        await interaction.editReply({
          content: `${removedCount} claim(s) removed successfully.`,
          components: []
        });
      } else if (result === 'cancel') {
        await interaction.editReply({
          content: 'Claim removal cancelled.',
          components: []
        });
      } else {
        await interaction.editReply({
          content: 'No response — claim removal timed out. No changes made.',
          components: []
        });
      }
    } finally {
      console.log('Claim removal process completed.');
      release();
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
