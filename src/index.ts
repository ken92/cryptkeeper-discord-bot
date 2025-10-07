import 'dotenv/config';
import fs from 'fs';
import DiscordBot from './client/DiscordBot';

fs.writeFileSync('./terminal.log', '', 'utf-8');

const client: DiscordBot = new DiscordBot();

export default client;

client.connect();

process.on('unhandledRejection', (reason: unknown) => {
  console.error(reason);
});
process.on('uncaughtException', (err: unknown) => {
  console.error(err);
});
