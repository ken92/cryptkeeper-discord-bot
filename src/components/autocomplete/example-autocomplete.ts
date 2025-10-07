import AutocompleteComponent from '../../structure/AutocompleteComponent';
import type DiscordBot from '../../client/DiscordBot';
import type { AutocompleteInteraction } from 'discord.js';

const fruits = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew'];

const component = new AutocompleteComponent({
  commandName: 'autocomplete',
  run: async (client: DiscordBot, interaction: AutocompleteInteraction) => {
    const currentInput = interaction.options.getFocused();
    const filtered = fruits
      .filter(f => f.toLowerCase().startsWith(String(currentInput).toLowerCase()))
      .slice(0, 25); // Discord limits to 25 suggestions

    await interaction.respond(filtered.map(f => ({ name: f, value: f })));
  }
});

export default component;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = component;
