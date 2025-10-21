import type DiscordBot from '../client/DiscordBot';

export type Claim = {
  partnername: string;
  partnersource?: string;
  username?: string;
  userId?: string;
  userid?: string; // some legacy keys in db
  sharingstatus?: string | null;
  romantic_sharingstatus?: string | null;
  platonic_sharingstatus?: string | null;
  addedById?: string;
  addedByUsername?: string;
  timestamp?: number;
  lastEditedById?: string;
  lastEditedByUsername?: string;
  lastEditedTimestamp?: number;
  [k: string]: any;
};

export default class ClaimHelper {
  client: DiscordBot;

  constructor(client: DiscordBot) {
    this.client = client;
  }

  // ---------- Helpers ----------
  private key(guildId: string, suffix: string) {
    return `${guildId}-${suffix}`;
  }

  private readArrayKey<T = any>(key: string): T[] {
    const raw = this.client.database.get(key);
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as T[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private writeArrayKey<T = any>(key: string, value: T[]) {
    // store array directly (QuickYAML supports objects). keep compatibility with older code.
    this.client.database.set(key, value as never);
  }

  private normalizePartner(partnername: string) {
    return String(partnername || '').trim().toLowerCase();
  }

  // ---------- Claims CRUD ----------
  getClaims(guildId: string): Claim[] {
    return this.readArrayKey<Claim>(this.key(guildId, 'claims'));
  }

  setClaims(guildId: string, claims: Claim[]) {
    // keep claims sorted for stable iteration
    claims.sort((a, b) =>
      String(a.partnername || '').toLowerCase() > String(b.partnername || '').toLowerCase() ? 1 : -1
    );
    this.writeArrayKey(this.key(guildId, 'claims'), claims);
  }

  addClaim(guildId: string, claim: Claim) {
    const key = this.key(guildId, 'claims');
    const claims = this.getClaims(guildId);
    claims.push(claim);
    this.setClaims(guildId, claims);
  }

  // remove claims matching partner name (exact match, case-insensitive) and optional userId
  removeClaimsByPartnerAndUser(guildId: string, partnername: string, userId?: string): number {
    const claims = this.getClaims(guildId);
    const normalized = this.normalizePartner(partnername);
    const filtered = claims.filter((c) => {
      const cName = this.normalizePartner(c.partnername || '');
      const matchesName = cName === normalized;
      const matchesUser = userId ? ((String(c.userId || c.userid || '') === userId)) : true;
      return !(matchesName && matchesUser);
    });
    this.setClaims(guildId, filtered);
    return claims.length - filtered.length;
  }

  // remove claims for an array of userIds (used for stale-removal)
  removeClaimsByUserIds(guildId: string, userIds: string[]): number {
    if (!userIds || userIds.length === 0) return 0;
    const claims = this.getClaims(guildId);
    const filtered = claims.filter(c => !userIds.includes(String(c.userId || c.userid || '')));
    this.setClaims(guildId, filtered);
    return claims.length - filtered.length;
  }

  // update claims that match a predicate; updater mutates a claim object
  updateClaims(guildId: string, predicate: (c: Claim) => boolean, updater: (c: Claim) => void): number {
    const claims = this.getClaims(guildId);
    let changed = 0;
    for (const c of claims) {
      if (predicate(c)) {
        updater(c);
        changed++;
      }
    }
    if (changed > 0) this.setClaims(guildId, claims);
    return changed;
  }

  // find all claims matching partnername normalized (returns group)
  findClaimsByPartner(guildId: string, partnername: string): Claim[] {
    const normalized = this.normalizePartner(partnername);
    return this.getClaims(guildId).filter(c => this.normalizePartner(c.partnername || '') === normalized);
  }

  // ---------- Status emoji helpers ----------
  getStatusEmojis(guildId: string): Record<string, string> {
    return this.client.database.get(this.key(guildId, 'statusEmojis')) || {};
  }

  setStatusEmoji(guildId: string, status: string, emoji: string) {
    const key = this.key(guildId, 'statusEmojis');
    const map = this.getStatusEmojis(guildId);
    map[status] = emoji;
    this.client.database.set(key, map as never);
  }

  // ---------- Claim list channel / message ids ----------
  getClaimListChannelId(guildId: string): string | null {
    return this.client.database.get(this.key(guildId, 'claimListChannelId')) || null;
  }

  setClaimListChannelId(guildId: string, channelId: string) {
    this.client.database.set(this.key(guildId, 'claimListChannelId'), String(channelId) as never);
  }

  getClaimListMessageIds(guildId: string): string[] {
    // supports legacy JSON-string stored arrays
    return this.readArrayKey<string>(this.key(guildId, 'claimListMessageId'));
  }

  setClaimListMessageIds(guildId: string, ids: string[]) {
    this.writeArrayKey(this.key(guildId, 'claimListMessageId'), ids);
  }

  addClaimListMessageId(guildId: string, id: string) {
    const ids = this.getClaimListMessageIds(guildId);
    ids.push(id);
    this.setClaimListMessageIds(guildId, ids);
  }

  clearClaimListMessageIds(guildId: string) {
    this.client.database.delete(this.key(guildId, 'claimListMessageId'));
  }

  // ---------- Utility ----------
  // ensure claims are sorted in DB (useful after migrations)
  ensureSorted(guildId: string) {
    const claims = this.getClaims(guildId);
    this.setClaims(guildId, claims);
  }
}

// Provide CommonJS compatibility so existing require() calls keep working
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = (module.exports as any).default || module.exports;
