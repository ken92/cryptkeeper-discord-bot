import type DiscordBot from '../client/DiscordBot';
import type { Interaction, Awaitable } from 'discord.js';

type RunFn<I extends Interaction = Interaction> = (client: DiscordBot, interaction: I) => Awaitable<unknown>;

interface ApplicationCommandStructure<I extends Interaction = Interaction> {
  command: any;
  options?: Partial<{ cooldown: number; botOwner: boolean; guildOwner: boolean; botDevelopers: boolean }>;
  run: RunFn<I>;
}

class ApplicationCommand<I extends Interaction = Interaction> {
  [key: string]: any;

  constructor(structure: ApplicationCommandStructure<I>) {
    Object.assign(this, {
      __type__: 1,
      command: structure.command,
      options: structure.options,
      run: structure.run
    });
  }

  toJSON() {
    return {
      __type__: this.__type__,
      command: this.command,
      options: this.options,
      run: this.run
    };
  }
}

export default ApplicationCommand;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = ApplicationCommand;
