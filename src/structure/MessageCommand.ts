import type DiscordBot from '../client/DiscordBot';
import type { Message, PermissionResolvable, Awaitable } from 'discord.js';

interface MessageCommandStructure {
  command: {
    name: string;
    description?: string;
    aliases?: string[];
    permissions?: PermissionResolvable[];
  };
  options?: Partial<{
    cooldown: number;
    botOwner: boolean;
    guildOwner: boolean;
    botDevelopers: boolean;
    nsfw: boolean;
  }>;
  run: (client: DiscordBot, message: Message, args: string[]) => Awaitable<void>;
}

class MessageCommand {
  public data: {
    __type__: number;
    command: MessageCommandStructure['command'];
    options?: MessageCommandStructure['options'];
    run: MessageCommandStructure['run'];
  };

  constructor(structure: MessageCommandStructure) {
    this.data = {
      __type__: 2,
      ...structure
    };
  }

  toJSON() {
    return { ...this.data };
  }
}

export default MessageCommand;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = MessageCommand;
