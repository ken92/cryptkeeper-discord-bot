import crypto from 'crypto';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const hashObject = (obj: Json): string =>
  crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');

export default hashObject;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = hashObject;
