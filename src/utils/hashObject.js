const crypto = require('crypto');
const hashObject = (obj) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');

module.exports = hashObject;
