import type DiscordBot from '../../client/DiscordBot';
import type { ChatInputCommandInteraction, Message, User } from 'discord.js';
import { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import ApplicationCommand from '../../structure/ApplicationCommand';
import claimLock from '../../utils/claimLock';
import ClaimHelper from '../../utils/ClaimHelper';

const command = new SlashCommandBuilder()
  .setName('updateclaimstatus')
  .setDescription('Update the status of a partner claim')
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
  run: async (client: DiscordBot, interaction: ChatInputCommandInteraction) => {
    const guildId = interaction.guild?.id;
    if (!guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    const helper = new ClaimHelper(client);
    const claims: any[] = helper.getClaims(guildId) || [];

    const username = interaction.options.getString('username') || null;
    const userId = interaction.options.getString('userid') || null;
    const user = interaction.options.getUser('user') || null;
    const partnerName = interaction.options.getString('partnername') || null;
    const partnerSource = interaction.options.getString('partnersource') || null;

    if (!username && !partnerName && !partnerSource && !user && !userId) {
      await interaction.reply({
        content: 'You must provide at least one search criteria (username, user, user ID, partner name, or partner source).',
        ephemeral: true
      });
      return;
    }

    const usernameFromId = userId ? (await client.users.fetch(userId).catch(() => null))?.username ?? null : null;
    const usernameFromUser = user ? user.username : null;
    const finalUsername = usernameFromId || usernameFromUser || username;
    const cleanedUsername = finalUsername ? finalUsername.replace(/<@!?(\d+)>/, '$1') : null;
    const trimmedUsername = cleanedUsername ? cleanedUsername.trim().toLowerCase() : null;

    const trimmedPartnerName = partnerName ? partnerName.trim().toLowerCase() : null;
    const trimmedPartnerSource = partnerSource ? partnerSource.trim().toLowerCase() : null;

    const filteredClaims = claims.filter(c => {
      const claimUsername = c.username ? String(c.username).toLowerCase() : '';
      const claimPartnerName = c.partnername ? String(c.partnername).toLowerCase() : '';
      const claimPartnerSource = c.partnersource ? String(c.partnersource).toLowerCase() : '';

      const isMatchingUsername = trimmedUsername ? claimUsername === trimmedUsername : true;
      const isMatchingPartnerName = trimmedPartnerName ? claimPartnerName.includes(trimmedPartnerName) : true;
      const isMatchingPartnerSource = trimmedPartnerSource ? claimPartnerSource.includes(trimmedPartnerSource) : true;
      return isMatchingUsername && isMatchingPartnerName && isMatchingPartnerSource;
    });

    if (filteredClaims.length === 0) {
      await interaction.reply({
        content: 'No claims found matching the provided criteria.',
        ephemeral: true
      });
      return;
    }

    const claimOptions = filteredClaims.slice(0, 25).map((c) => {
      const fullIndex = claims.indexOf(c);
      const label = String(c.partnername).slice(0, 100) || 'unknown';
      const descParts = [];
      if (c.username) descParts.push(String(c.username));
      if (c.partnersource) descParts.push(String(c.partnersource));
      const description = descParts.join(' • ').slice(0, 100) || undefined;
      return {
        label,
        description,
        value: String(fullIndex)
      };
    });

    const claimSelect = new StringSelectMenuBuilder()
      .setCustomId('claim_select')
      .setPlaceholder('Select a claim to update')
      .addOptions(claimOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(claimSelect);

    const prompt = (await interaction.reply({
      content: `Found ${filteredClaims.length} matching claim(s). Select the claim to update:`,
      components: [row.toJSON() as unknown as any],
      ephemeral: true,
      fetchReply: true
    })) as Message<boolean>;

    const collector = prompt.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      max: 1,
      time: 30_000
    });

    collector.on('collect', async (selectInteraction) => {
      const selectedValue = (selectInteraction as any).values?.[0];
      if (typeof selectedValue === 'undefined') {
        await selectInteraction.update({ content: 'No selection made.', components: [] });
        return;
      }
      const selectedIndex = Number(selectedValue);
      const claimToUpdate = helper.getClaims(guildId)[selectedIndex];
      if (!claimToUpdate) {
        await selectInteraction.update({ content: 'Selected claim no longer exists.', components: [] });
        return;
      }

      const scopeSelect = new StringSelectMenuBuilder()
        .setCustomId(`scope_select::${selectedIndex}`)
        .setPlaceholder('Select which status to update')
        .addOptions([
          { label: 'General (apply to all)', value: 'general' },
          { label: 'Romantic', value: 'romantic' },
          { label: 'Platonic', value: 'platonic' }
        ]);

      const scopeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(scopeSelect);
      await selectInteraction.update({
        content: `Selected: ${claimToUpdate.partnername} — choose which status to update:`,
        components: [scopeRow.toJSON() as unknown as any]
      });

      const scopeCollector = prompt.createMessageComponentCollector({
        filter: (si) => si.user.id === interaction.user.id,
        max: 1,
        time: 30_000
      });

      scopeCollector.on('collect', async (si) => {
        const scope = (si as any).values?.[0] as 'general' | 'romantic' | 'platonic';
        if (!scope) {
          await si.update({ content: 'No scope selected.', components: [] });
          return;
        }

        const statusSelect = new StringSelectMenuBuilder()
          .setCustomId(`status_select::${selectedIndex}::${scope}`)
          .setPlaceholder('Select new status')
          .addOptions([
            { label: 'Sharing', value: 'sharing' },
            { label: 'Non-sharing', value: 'non_sharing' },
            { label: 'Selective', value: 'selective' }
          ]);
        const statusRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(statusSelect);

        await si.update({
          content: `Choose the new status for ${claimToUpdate.partnername} (${scope}):`,
          components: [statusRow.toJSON() as unknown as any]
        });

        const statusCollector = prompt.createMessageComponentCollector({
          filter: (sii) => sii.user.id === interaction.user.id,
          max: 1,
          time: 30_000
        });

        statusCollector.on('collect', async (sii) => {
          const chosenStatus = (sii as any).values?.[0] as string;
          if (!chosenStatus) {
            await sii.update({ content: 'No status selected.', components: [] });
            return;
          }

          // perform update under lock
          const release = await claimLock.acquire();
          try {
            const allClaims = helper.getClaims(guildId);
            const target = allClaims[selectedIndex];
            if (!target) {
              await sii.update({ content: 'Claim disappeared before update. No changes made.', components: [] });
              return;
            }
            if (scope === 'general') {
              target.sharingstatus = chosenStatus;
              target.romantic_sharingstatus = chosenStatus;
              target.platonic_sharingstatus = chosenStatus;
            } else if (scope === 'romantic') {
              target.romantic_sharingstatus = chosenStatus;
            } else {
              target.platonic_sharingstatus = chosenStatus;
            }
            target.lastEditedById = interaction.user.id;
            target.lastEditedByUsername = `${interaction.user.username}#${(interaction.user as any).discriminator || ''}`;
            target.lastEditedTimestamp = Date.now();

            helper.setClaims(guildId, allClaims);
          } finally {
            release();
          }

          await sii.update({
            content: `Updated ${claimToUpdate.partnername} (${scope}) → ${chosenStatus}`,
            components: []
          });
        });

        statusCollector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.editReply({ content: 'Status selection timed out. No changes made.', components: [] }).catch(() => {});
          }
        });
      });

      scopeCollector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.editReply({ content: 'Scope selection timed out. No changes made.', components: [] }).catch(() => {});
        }
      });
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'Claim selection timed out. No changes made.', components: [] }).catch(() => {});
      }
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
