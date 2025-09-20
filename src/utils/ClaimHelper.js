const hashObject = require("./hashObject");

class ClaimHelper {
  constructor(client, guildId) {
    this.client = client;
    this.guildId = guildId;
  }

  getClaimHash(partnerName, username) {
    return hashObject({ partnerName, username });
  }

/*
pseudo code for database structure
{
  [guildId]-useridstokeys: { [userId]: [hashObjectKey, hashObjectKey, ...] },
  [guildId]-partnersources: [string, string, ...],
  [guildId]-claims: {
    [hashObjectKey]: {
      partnername: string,
      partnersource: string,
      username: string,
      userId: string,
      sharingstatus: string,
      romantic_sharingstatus: string,
      platonic_sharingstatus: string,
      addedById: string,
      addedByUsername: string,
      timestamp: number
    }
  }
}
*/





  async getClaims() {
    return this.client.database.get(`${this.guildId}-claims`) || [];
  }

  // Returns the number of claims removed
  removeClaim = async (partnerName, username) => {
    const claims = this.getClaims();
    const trimmedUsername = username ? username.trim() : null;
    const trimmedPartnerName = partnerName.trim();
  
    const newClaims = claims.filter(c => {
      const isMatchingUsername = trimmedUsername ? c.username.toLowerCase() === trimmedUsername.toLowerCase() : true;
      const isMatchingPartnerName = c.partnername.toLowerCase() === trimmedPartnerName.toLowerCase();
      return !(isMatchingUsername && isMatchingPartnerName);
    });
    if (newClaims.length === claims.length) {
      return 0;
    }
    this.client.database.set(`${this.guildId}-claims`, newClaims);
    return Math.abs(claims.length - newClaims.length);
  };
}

module.exports = ClaimHelper;
