import { Mutex } from 'async-mutex';

const claimLock = new Mutex();

export default claimLock;
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = claimLock;
