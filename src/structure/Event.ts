import type DiscordBot from '../client/DiscordBot';
import type { ClientEvents } from 'discord.js';

type EventRun<K extends keyof ClientEvents = keyof ClientEvents> =
  (client: DiscordBot, ...args: ClientEvents[K]) => Promise<void> | void;

interface EventStructure<K extends keyof ClientEvents = keyof ClientEvents> {
  event: K;
  once?: boolean;
  run: EventRun<K>;
}

class Event<K extends keyof ClientEvents = keyof ClientEvents> {
  public data: {
    __type__: number;
    event: K;
    once?: boolean;
    run: EventRun<K>;
  };

  constructor(structure: EventStructure<K>) {
    this.data = {
      __type__: 5, // used by the handler
      ...structure
    };
  }

  toJSON() {
    return { ...this.data };
  }
}

export default Event;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = Event;