import type DiscordBot from '../client/DiscordBot';
import type { Awaitable, AutocompleteInteraction } from 'discord.js';

interface AutocompleteStructure {
  commandName: string;
  run: (client: DiscordBot, interaction: AutocompleteInteraction) => Awaitable<void>;
}

class AutocompleteComponent {
  public data: {
    __type__: number;
    commandName: string;
    run: (client: DiscordBot, interaction: AutocompleteInteraction) => Awaitable<void>;
  };

  constructor(structure: AutocompleteStructure) {
    this.data = {
      __type__: 4, // Used by the handler
      ...structure
    };
  }

  toJSON() {
    return { ...this.data };
  }
}

export default AutocompleteComponent;
module.exports = AutocompleteComponent;
