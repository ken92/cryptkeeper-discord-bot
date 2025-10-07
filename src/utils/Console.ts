import 'colors';
import fs from 'fs';

type MsgPart = unknown;

const LOG_PATH = './terminal.log';

function readLog(): string {
  try {
    if (!fs.existsSync(LOG_PATH)) return '';
    return fs.readFileSync(LOG_PATH, 'utf-8');
  } catch {
    return '';
  }
}

function writeLog(content: string) {
  fs.writeFileSync(LOG_PATH, content, 'utf-8');
}

function formatMessageParts(parts: MsgPart[]): string {
  return parts.map((p) => String(p)).join(' ');
}

export const info = (...message: MsgPart[]) => {
  const time = new Date().toLocaleTimeString();
  const timeTag = ( `[${time}]` as any).gray;
  const levelTag = ( '[Info]' as any).blue;
  const text = formatMessageParts(message);

  console.info(timeTag, levelTag, text);

  const fileContent = readLog() + [String(timeTag), String(levelTag), text].join(' ') + '\n';
  writeLog(fileContent);
};

export const success = (...message: MsgPart[]) => {
  const time = new Date().toLocaleTimeString();
  const timeTag = ( `[${time}]` as any).gray;
  const levelTag = ( '[OK]' as any).green;
  const text = formatMessageParts(message);

  console.info(timeTag, levelTag, text);

  const fileContent = readLog() + [String(timeTag), String(levelTag), text].join(' ') + '\n';
  writeLog(fileContent);
};

export const error = (...message: MsgPart[]) => {
  const time = new Date().toLocaleTimeString();
  const timeTag = ( `[${time}]` as any).gray;
  const levelTag = ( '[Error]' as any).red;
  const text = formatMessageParts(message);

  console.error(timeTag, levelTag, text);

  const fileContent = readLog() + [String(timeTag), String(levelTag), text].join(' ') + '\n';
  writeLog(fileContent);
};

export const warn = (...message: MsgPart[]) => {
  const time = new Date().toLocaleTimeString();
  const timeTag = ( `[${time}]` as any).gray;
  const levelTag = ( '[Warning]' as any).yellow;
  const text = formatMessageParts(message);

  console.warn(timeTag, levelTag, text);

  const fileContent = readLog() + [String(timeTag), String(levelTag), text].join(' ') + '\n';
  writeLog(fileContent);
};

export default { info, success, error, warn };
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = exports.default || module.exports;
