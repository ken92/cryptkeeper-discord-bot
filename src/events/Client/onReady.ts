import type DiscordBot from '../../client/DiscordBot';
import type { Client } from 'discord.js';
import { success } from '../../utils/Console';
import Event from '../../structure/Event';

const onReadyEvent = new Event({
  event: 'ready',
  once: true,
  run: (bot: DiscordBot, client: Client) => {
    const userTag = client.user?.tag ?? client.user?.username ?? 'unknown';
    const start = (bot as any).login_timestamp ?? Date.now();
    success('Logged in as ' + userTag + ', took ' + ((Date.now() - start) / 1000) + 's.');
  }
});

export default onReadyEvent;
// Provide CommonJS compatibility for existing require() consumers
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = onReadyEvent;
