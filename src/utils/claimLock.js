const { Mutex } = require('async-mutex');
const claimLock = new Mutex();
module.exports = claimLock;
