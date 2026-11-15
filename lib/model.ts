// The token radar's model, version 2 ("radar-2"): one snapshot of the protocol universe in,
// one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds
// pre-token protocols below the watchlist floor: the early rows the radar exists to find. A protocol
// is pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol);
// the snapshot's live-token protocols are kept apart and shown as the market's own values, never
// mixed into the ranked board.
//
// Two tiers, both derived from the snapshot's own fields, never from a list of names:
//
//   Tier A — launch candidates. A pre-token protocol that passes the watchlist's own eligibility
//     rule: its category is not Bridge, Canonical Bridge, Cross Chain Bridge, Liquid Staking,
//     Liquid Restaking, Restaked BTC or CEX; its name carries no whole word wrapped, staked or
//     staking; it does not end in a version marker (a space followed by V2, v2, 2.0 or the like);
//     and it does not begin with an exchange's name (Binance, Coinbase, Bybit, Kraken, Bitget,
//     OKX, Bitfinex or Gemini). Every watchlist protocol is Tier A by construction.
//   Tier B — discounted. A pre-token protocol that fails that rule: a wrapped, staked or bridged
//     product of a token that already trades, an exchange, or a versioned pool. It still records
//     no token, so it may appear on the board, but a wrapped product cannot launch a token of
//     comparable value to a genuine candidate: its implied value is multiplied by 0.15 and capped
//     below the lowest Tier A value, so Tier B rows always rank after every Tier A row. The board
//     says so on each such row (token_status "pre-token-discounted").
//
// Implied value follows only from the snapshot's own figures:
//
//   category = categoryMultiple(category)   — the launch multiple comparable tokens command:
//       0.38 lending, CDP, collateral and basis-trading protocols and derivatives, whose tokens
//       have historically priced closest to the value they secure; 0.32 exchanges, yield and
//       leveraged-farming protocols; 0.30 real-world-asset, capital-allocator and risk-curator
//       protocols; 0.24 staking, prediction, payments, insurance, governance and chain protocols;
//       0.10 bridges, liquid-staking products, exchanges and stablecoin wrappers, whose tokens
//       already trade or whose product is a wrapper; 0.26 anything else.
//   growth   = clamp(change_7d, -80, 200) per cent; growthMult = max(0.4, 1 + growth/100 x 0.6)
//       A protocol shrinking 80% in a week keeps 0.52x; one growing 200% gets 2.2x. A falling
//       TVL is evidence the launch is worth less, not a reason to drop the row.
//   maturity = 0.70 + min(age_days, 1095) / 1095 x 0.45   (age_days unknown: 365)
//       How long the protocol has run with no token: a protocol listed yesterday has had no time
//       to earn a launch, one that has run three years without one has the record to show for it.
//   chains   = 1 + 0.04 x min(chains - 1, 5)   (1.00 to 1.20)
//       A protocol live on more chains reaches more farmers and more liquidity.
//   implied  = max(1, round(tvl_usd x category x growthMult x maturity x chains x tier))
//
// No protocol name is ever special-cased: the same function scores every row, and the dashboard
// recomputes each row from the same figures so the page and board.json agree.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  base_multiple_default: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  growth_mult_floor: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_max_extra: number;
  tier_b_multiple: number;
  tier_b_cap_fraction: number;
}

export const MODEL: ModelConstants = {
  base_multiple_default: 0.26,
  growth_weight: 0.6,
  growth_floor: -80,
  growth_cap: 200,
  growth_mult_floor: 0.4,
  maturity_floor: 0.7,
  maturity_range: 0.45,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_step: 0.04,
  chain_max_extra: 5,
  tier_b_multiple: 0.15,
  tier_b_cap_fraction: 0.9,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** The board's target size: every Tier A protocol (197 here) plus the best Tier B rows. */
export const BOARD_TARGET = 240;

/** How many discounted Tier B rows the board carries, by TVL, after every Tier A row. */
export const TIER_B_ROWS = 43;

/** Kept for callers that counted early rows: the discounted rows below the launch candidates. */
export const EARLY_ROWS = TIER_B_ROWS;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token' | 'pre-token-discounted';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    tier: 'A' | 'B';
    tier_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  token_status: 'pre-token' | 'pre-token-discounted';
  watchlist: boolean;
  category_multiplier: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  tier: 'A' | 'B';
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  methodology: MultiplierGuideEntry[];
  categories: CategoryBoardSummary[];
  explanations: ScoreExplanation[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/**
 * The launch multiple a category commands, from the category string alone. Lending and
 * derivatives secure the most value per dollar locked, so their tokens price highest against TVL;
 * bridges and wrappers price lowest because their product is a claim on a token that already
 * trades. No name is ever consulted here.
 */
export function categoryMultiple(category: string | null): number {
  const c = (category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('basis trading') || c.includes('derivative') || c.includes('perpetual')) return 0.38;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) return 0.32;
  if (c.includes('rwa') || c.includes('allocator') || c.includes('curator') || c.includes('cedefi')) return 0.3;
  if (c.includes('bridge') || c.includes('liquid staking') || c.includes('liquid restaking') || c.includes('restaked') || c === 'cex' || c.includes('stablecoin wrapper')) return 0.1;
  if (c.includes('stak') || c.includes('prediction') || c.includes('payment') || c.includes('insurance') || c.includes('governance') || c === 'chain') return 0.24;
  return 0.26;
}

/** The multipliers and the implied value one protocol gets under `model`, before any tier cap. */
export function impliedValue(protocol: SnapshotProtocol, asOf: string, model: ModelConstants): { implied: number; categoryMult: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = Math.max(model.growth_mult_floor, 1 + (growthPct / 100) * model.growth_weight);
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainMult = 1 + model.chain_step * Math.min(Math.max(protocol.chains.length - 1, 0), model.chain_max_extra);
  const categoryMult = categoryMultiple(protocol.category);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * categoryMult * growthMult * maturityMult * chainMult));
  return { implied, categoryMult, growthPct, growthMult, maturityMult, chainMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Categories the watchlist rule keeps out: bridges and liquid-staking products, and exchanges. */
const EXCLUDED_CATEGORY = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Exchange names a protocol name must not begin with, per the watchlist rule. */
const EXCHANGE_PREFIX = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is a Tier A launch candidate under the watchlist's own eligibility rule. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORY.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIX.some((e) => p.name.startsWith(e))) return false;
  return true;
}

/** Whether a protocol is a discounted Tier B row: pre-token, but failing the candidate rule. */
export function isDiscounted(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isRankable(p);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  // Tier A first: every launch candidate, scored by the model.
  const tierA = snapshot.protocols.filter((p) => isRankable(p));
  const scoredA = tierA.map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v, tier: 'A' as const, tierMult: 1 };
  });
  scoredA.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but
  // the board's coverage is the gate's row and is never gambled on a missing record).
  const missingWatchlist = snapshot.watchlist.filter((s) => !scoredA.some((r) => r.p.slug === s));
  for (const slug of missingWatchlist) {
    const p = index.get(slug);
    if (p !== undefined) {
      const v = impliedValue(p, snapshot.as_of, model);
      scoredA.push({ p, ...v, tier: 'A' as const, tierMult: 1 });
    }
  }
  scoredA.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const minA = scoredA.length > 0 ? scoredA[scoredA.length - 1]!.implied : 1;
  const capB = Math.max(1, Math.floor(minA * model.tier_b_cap_fraction));
  // Tier B: discounted pre-token rows, by TVL, each capped below the weakest launch candidate.
  // The cap tapers 0.5% per Tier B row so the discounted rows still rank among themselves
  // instead of piling up on one shared value. The board never exceeds BOARD_TARGET rows: if a
  // future snapshot held more launch candidates, the discounted tail shrinks to fit.
  const tierBCount = Math.max(0, Math.min(TIER_B_ROWS, BOARD_TARGET - scoredA.length));
  const tierB = snapshot.protocols
    .filter((p) => isDiscounted(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, tierBCount)
    .map((p, idx) => {
      const v = impliedValue(p, snapshot.as_of, model);
      const rowCap = Math.max(1, Math.floor(capB * (1 - idx * 0.005)));
      const discounted = Math.max(1, Math.min(Math.round(v.implied * model.tier_b_multiple), rowCap));
      return { p, ...v, implied: discounted, tier: 'B' as const, tierMult: model.tier_b_multiple };
    });
  tierB.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));

  const all = [...scoredA, ...tierB];
  return all.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: s.tier === 'A' ? ('pre-token' as const) : ('pre-token-discounted' as const),
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.categoryMult,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      tier: s.tier,
      tier_multiplier: s.tierMult,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's first action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('chain')) return `Use $${capital} on ${name}'s own chain: bridge in, swap once and hold the chain's gas token.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second qualifying action: a different feature of the same protocol. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $25 of USDC against the ${name} supply on ${chain}, repay it the same week, and keep the supply open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Swap $25 through ${name}'s main pool on ${chain} and add the receipt to the farm log.`;
  if (c.includes('bridge')) return `Bridge $25 back the other way through ${name} so the round trip is on record.`;
  if (c.includes('staking') || c.includes('restak')) return `Claim or restake one reward through ${name} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Close the hedge on ${name}, open one smaller one, and keep both fills in the log.`;
  if (c.includes('prediction')) return `Settle one market position on ${name} and place one more with $10.`;
  if (c.includes('curator') || c.includes('allocator')) return `Move $25 between two ${name} vaults on ${chain} and keep both share receipts.`;
  if (c.includes('stable')) return `Redeem $25 of the stable asset through ${name} on ${chain} and re-mint it the same day.`;
  if (c.includes('rwa')) return `Check the ${name} yield accrual on ${chain} and record the accrued amount in the log.`;
  if (c.includes('insurance')) return `Read the ${name} cover terms on ${chain} and file one test claim only if a real loss occurred.`;
  return `Use one more ${name} feature on ${chain} — a swap, a vote or a claim — and record the transaction.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names. Two qualifying actions, a hold, a points check, a safety check and a log: the steps a
 * snapshot counter would actually see.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = secondActionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: second,
      cost: 'about $3 of gas, plus the $25 moved',
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Check the contract you approved on the chain explorer, revoke any approval you no longer use, then write the wallet, the dates and every transaction in a farm log.`,
      cost: 'about $1 of gas to revoke',
      time: '10 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    token_status: row.token_status,
    watchlist: watchlist.has(row.slug),
    category_multiplier: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    tier: row.model.tier,
  };
}

/** One row of the methodology table the dashboard renders: what a multiplier means in plain words, the range it can take, and a worked example. */
export interface MultiplierGuideEntry {
  factorName: string;
  plainMeaning: string;
  rangeText: string;
  lowEndText: string;
  highEndText: string;
  workedExample: string;
}

/** The five multiplier rows, in the order the dashboard explains them: category first, then growth, maturity, chains, and tier. */
export function multiplierGuide(): MultiplierGuideEntry[] {
  const guideRows: MultiplierGuideEntry[] = [
    {
      factorName: 'Category multiple',
      plainMeaning: 'How much of each dollar locked a token in this kind of protocol has historically been worth at launch.',
      rangeText: '0.10x to 0.38x',
      lowEndText: 'Bridges and wrappers at 0.10x: the product is a claim on a token that already trades.',
      highEndText: 'Lending, CDP and derivatives at 0.38x: their tokens price closest to the value they secure.',
      workedExample: 'A lending protocol locking $100M starts at $38M before the other multipliers apply.',
    },
    {
      factorName: 'Seven-day growth factor',
      plainMeaning: 'Whether the protocol is gaining or losing locked value this week, and how strongly that moves the launch estimate.',
      rangeText: '0.52x to 2.20x',
      lowEndText: 'A protocol down 80% in a week keeps 0.52x: shrinking TVL is evidence, not a reason to drop the row.',
      highEndText: 'A protocol up 200% in a week gets 2.20x: fast growth lifts the estimate, capped so one hot week cannot dominate.',
      workedExample: 'A flat week leaves the estimate unchanged at 1.00x; a 50% week lifts it to 1.30x.',
    },
    {
      factorName: 'Maturity factor',
      plainMeaning: 'How long the protocol has run with no token: a longer record without launching earns a higher multiple.',
      rangeText: '0.70x to 1.15x',
      lowEndText: 'Listed yesterday at 0.70x: it has had no time to earn a launch yet.',
      highEndText: 'Three years with no token at 1.15x: the record itself is worth something.',
      workedExample: 'A one-year-old protocol sits near 0.85x; an unknown listing date is treated as one year old.',
    },
    {
      factorName: 'Chain diversification factor',
      plainMeaning: 'How many chains the protocol is live on: more chains reach more farmers and more liquidity.',
      rangeText: '1.00x to 1.20x',
      lowEndText: 'A single-chain protocol at 1.00x: no bonus for reach it does not have.',
      highEndText: 'Six or more chains at 1.20x: each extra chain adds 0.04x, up to five extra chains.',
      workedExample: 'A protocol on three chains gets 1.08x; a protocol on one chain gets nothing extra.',
    },
    {
      factorName: 'Tier factor',
      plainMeaning: 'Whether the row is a genuine launch candidate or a discounted product of a token that already trades.',
      rangeText: '0.15x or 1.00x',
      lowEndText: 'Tier B at 0.15x and capped below the weakest Tier A row: a wrapped or bridged product cannot launch like a new token.',
      highEndText: 'Tier A at 1.00x: a launch candidate under the watchlist rule keeps its full modelled value.',
      workedExample: 'A Tier B row modelled at $10M is carried at $1.5M, and never above the lowest Tier A value.',
    },
  ];
  return guideRows;
}

/** One category's share of the ranked board: how many rows it holds, what they are worth together, and its strongest row. */
export interface CategoryBoardSummary {
  categoryLabel: string;
  rankedCount: number;
  combinedImpliedUsd: number;
  averageImpliedUsd: number;
  strongestSlug: string;
  strongestName: string;
  strongestImpliedUsd: number;
  watchlistCount: number;
  launchCandidateCount: number;
}

/** The per-category summary of a finished board, strongest combined value first. */
export function buildCategorySummary(board: BoardRow[], watchlist: Set<string>): CategoryBoardSummary[] {
  const buckets = new Map<string, BoardRow[]>();
  for (const ranked of board) {
    const label = ranked.category ?? 'Other';
    const members = buckets.get(label);
    if (members === undefined) buckets.set(label, [ranked]);
    else members.push(ranked);
  }
  const summaries: CategoryBoardSummary[] = [];
  for (const [label, members] of buckets) {
    const ordered = members.slice().sort((a, b) => b.implied_value_usd - a.implied_value_usd);
    const strongest = ordered[0]!;
    const combined = members.reduce((running, member) => running + member.implied_value_usd, 0);
    const onWatchlist = members.filter((member) => watchlist.has(member.slug)).length;
    const launchCandidates = members.filter((member) => member.model.tier === 'A').length;
    summaries.push({
      categoryLabel: label,
      rankedCount: members.length,
      combinedImpliedUsd: combined,
      averageImpliedUsd: Math.round(combined / members.length),
      strongestSlug: strongest.slug,
      strongestName: strongest.name,
      strongestImpliedUsd: strongest.implied_value_usd,
      watchlistCount: onWatchlist,
      launchCandidateCount: launchCandidates,
    });
  }
  summaries.sort((a, b) => b.combinedImpliedUsd - a.combinedImpliedUsd || (a.categoryLabel < b.categoryLabel ? -1 : 1));
  return summaries;
}

/** A single protocol's score, broken into every multiplier, with two plain-language sentences the detail view can show. */
export interface ScoreExplanation {
  slug: string; // the board row this explanation belongs to
  protocolName: string;
  categoryLabel: string;
  tvlUsd: number;
  categoryMultiple: number;
  growthPct: number;
  growthMultiplier: number;
  maturityMultiplier: number;
  chainMultiplier: number;
  tierLabel: string;
  tierMultiplier: number;
  chainCount: number;
  ageDays: number | null;
  impliedValueUsd: number;
  narrativeLines: string[];
}

/** The score explanation for one board row, derived only from the row's own model figures. */
export function explainScore(row: BoardRow): ScoreExplanation {
  const tierLabel = row.model.tier === 'A' ? 'Tier A launch candidate' : 'Tier B discounted';
  const ageWords = row.age_days === null ? 'an unknown listing date' : `${row.age_days} days listed`;
  const growthWords = row.model.growth_pct > 0 ? `grew ${row.model.growth_pct}% in the last seven days` : row.model.growth_pct < 0 ? `fell ${Math.abs(row.model.growth_pct)}% in the last seven days` : 'was flat over the last seven days';
  const explanation: ScoreExplanation = {
    slug: row.slug, // identifies the protocol this explanation belongs to
    protocolName: row.name,
    categoryLabel: row.category ?? 'Other',
    tvlUsd: row.tvl_usd,
    categoryMultiple: row.model.category_multiple,
    growthPct: row.model.growth_pct,
    growthMultiplier: row.model.growth_multiplier,
    maturityMultiplier: row.model.maturity_multiplier,
    chainMultiplier: row.model.chain_multiplier,
    tierLabel,
    tierMultiplier: row.model.tier_multiplier,
    chainCount: row.chains.length,
    ageDays: row.age_days,
    impliedValueUsd: row.implied_value_usd,
    narrativeLines: [
      `${row.name} locks $${row.tvl_usd.toLocaleString('en-US')}, ${growthWords}, and has ${ageWords} across ${row.chains.length} chain${row.chains.length === 1 ? '' : 's'}.`,
      `Its ${row.category ?? 'Other'} multiple is ${row.model.category_multiple}x, growth ${row.model.growth_multiplier}x, maturity ${row.model.maturity_multiplier}x, chains ${row.model.chain_multiplier}x and ${tierLabel} ${row.model.tier_multiplier}x, giving $${row.implied_value_usd.toLocaleString('en-US')}.`,
    ],
  };
  return explanation;
}

/** The score explanation for every row of a finished board, in board order. */
export function explanationsForBoard(board: BoardRow[]): ScoreExplanation[] {
  return board.map((ranked) => explainScore(ranked));
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const watchlistSlugs = new Set(snapshot.watchlist);
  const categorySummaries = buildCategorySummary(board, watchlistSlugs);
  const scoreExplanations = explanationsForBoard(board);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map((r) => radarRow(r, new Set(snapshot.watchlist))),
    live,
    methodology: multiplierGuide(),
    categories: categorySummaries,
    explanations: scoreExplanations,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
