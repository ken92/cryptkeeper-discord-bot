import type DiscordBot from '../client/DiscordBot';
import type { Awaitable, Interaction } from 'discord.js';

interface ComponentStructure {
  customId: string;
  type: 'modal' | 'select' | 'button';
  options?: Partial<{ public: boolean }>;
  run: (client: DiscordBot, interaction: Interaction) => Awaitable<void>;
}

class Component {
  public data: {
    __type__: number;
    customId: string;
    type: 'modal' | 'select' | 'button';
    options?: Partial<{ public: boolean }>;
    run: (client: DiscordBot, interaction: Interaction) => Awaitable<void>;
  };

  constructor(structure: ComponentStructure) {
    this.data = {
      __type__: 3, // used by the handler
      ...structure
    };
  }

  toJSON() {
    return { ...this.data };
  }
}

export default Component;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = Component;
