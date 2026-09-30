// Illustrative data for the landing page only. Never sent to or read from the backend.

export type Tier = 0 | 1 | 2; // 0 source, 1 claim, 2 answer

export interface LatticeNode {
  id: string;
  tier: Tier;
  label: string;
  meta: string;
  pos: [number, number, number];
}

export interface LatticeEdge {
  from: number;
  to: number;
  /** 0 = source→claim, 1 = claim→answer. Only set on the traced tamper path. */
  hop?: 0 | 1;
}

// Small seeded PRNG so the lattice is identical on every load.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const SOURCES = [
  ['annual_report.pdf', 'e277b8…'],
  ['pricing_policy.docx', '9a01fe…'],
  ['partner_terms.md', '41c7d2…'],
  ['vendor_contract.docx', 'b83e10…'],
  ['confluence/refunds', '5dd9a4…'],
  ['sharepoint/hr-leave', '07fa3c…'],
  ['api/rates.json', 'c2e6b1…'],
];

const CLAIMS = [
  'partner share = 20%',
  'payout within 30 days',
  'refund window 14 days',
  'SLA 99.9% uptime',
  'annual fee waived',
  'leave carry-over 5 days',
  'rate cap 4.5%',
  'data kept in-region',
  'vendor liability capped',
  'renewal auto-opt-in',
  'support 24×7',
  'termination 60 days notice',
  'discount tier B = 12%',
  'invoice net-45',
];

const ANSWERS = [
  'What share do partners get?',
  'When are partners paid?',
  'Summarise partner economics',
  'Can I get a refund after 10 days?',
  'What uptime do we promise?',
  'How much leave carries over?',
  'Is customer data stored abroad?',
  'What is the rate cap?',
  'Can the vendor contract auto-renew?',
  'What are our payment terms?',
];

const rand = rng(7);
const spread = (r: number) => (rand() - 0.5) * r;

function tierPos(tier: Tier, i: number, n: number): [number, number, number] {
  const x = [-5.2, 0, 5.2][tier];
  const y = ((i + 0.5) / n - 0.5) * (tier === 1 ? 7.4 : 6) + spread(0.7);
  return [x + spread(1.4), y, spread(3.2)];
}

export const NODES: LatticeNode[] = [
  ...SOURCES.map(([name, hash], i) => ({
    id: `s${i}`,
    tier: 0 as Tier,
    label: name,
    meta: `sha256 ${hash}`,
    pos: tierPos(0, i, SOURCES.length),
  })),
  ...CLAIMS.map((c, i) => ({
    id: `c${i}`,
    tier: 1 as Tier,
    label: c,
    meta: 'claim',
    pos: tierPos(1, i, CLAIMS.length),
  })),
  ...ANSWERS.map((a, i) => ({
    id: `a${i}`,
    tier: 2 as Tier,
    label: a,
    meta: 'AI answer',
    pos: tierPos(2, i, ANSWERS.length),
  })),
];

const idx = (id: string) => NODES.findIndex((n) => n.id === id);

/** The traced tamper path: annual_report.pdf → two claims → three answers. */
export const TAMPERED_SOURCE = idx('s0');
export const INJECTED_SOURCE = idx('s3');
export const PATH_CLAIMS = [idx('c0'), idx('c1')];
export const PATH_ANSWERS = [idx('a0'), idx('a1'), idx('a2')];

export const EDGES: LatticeEdge[] = (() => {
  const e: LatticeEdge[] = [];
  // Path first so it is easy to reason about.
  PATH_CLAIMS.forEach((c) => e.push({ from: TAMPERED_SOURCE, to: c, hop: 0 }));
  e.push({ from: PATH_CLAIMS[0], to: PATH_ANSWERS[0], hop: 1 });
  e.push({ from: PATH_CLAIMS[0], to: PATH_ANSWERS[2], hop: 1 });
  e.push({ from: PATH_CLAIMS[1], to: PATH_ANSWERS[1], hop: 1 });
  e.push({ from: PATH_CLAIMS[1], to: PATH_ANSWERS[2], hop: 1 });

  // Everything else: each claim hangs off one source, each answer cites 1–2 claims.
  const sources = NODES.filter((n) => n.tier === 0).map((n) => idx(n.id));
  const claims = NODES.filter((n) => n.tier === 1).map((n) => idx(n.id));
  const answers = NODES.filter((n) => n.tier === 2).map((n) => idx(n.id));
  claims.slice(2).forEach((c, i) => e.push({ from: sources[1 + (i % (sources.length - 1))], to: c }));
  answers.slice(3).forEach((a, i) => {
    e.push({ from: claims[2 + ((i * 2) % (claims.length - 2))], to: a });
    if (i % 2 === 0) e.push({ from: claims[2 + ((i * 2 + 3) % (claims.length - 2))], to: a });
  });
  return e;
})();

export const CHAPTERS = [
  {
    n: '01',
    title: 'Your AI is only as trustworthy',
    rest: 'as the knowledge underneath it. Documents change quietly. Nobody re-checks the answers that were built on them.',
  },
  {
    n: '02',
    title: 'Every source gets a fingerprint.',
    rest: 'On ingest, Black Ice hashes each document with SHA-256 and extracts the claims it makes. The fingerprint is the baseline everything else is measured against.',
  },
  {
    n: '03',
    title: 'One number moves.',
    rest: 'A new version of annual_report.pdf arrives. The partner share drops from 20% to 5%. The hash no longer matches, and the claim is flagged as changed, not just the file.',
  },
  {
    n: '04',
    title: 'Some changes are attacks.',
    rest: 'A line hidden in a vendor contract tries to instruct the model. Black Ice treats it as an injection, quarantines the passage and keeps it out of retrieval.',
  },
  {
    n: '05',
    title: 'Then it follows the damage.',
    rest: 'From the changed source, through the claims it supports, to every AI answer that cited them. Three answers were built on the old 20%. Each is marked for review. Nothing else is touched.',
  },
  {
    n: '06',
    title: 'Trust is a number you can argue with.',
    rest: 'The score drops, and it shows its working: which sources moved, which claims changed, what contradicts what. Every step is written to an append-only audit log.',
  },
  {
    n: '07',
    title: 'It all happens on your side of the wall.',
    rest: 'Parsing, embeddings, the language model and the graph all run on your own infrastructure. Your knowledge never leaves it.',
  },
] as const;

export const SOURCE_TYPES = ['PDF', 'DOCX', 'Markdown', 'Websites', 'APIs', 'Confluence', 'SharePoint', 'SQL', 'Plain text'];

export const PRINCIPLES = [
  {
    title: 'Local-first',
    body: 'Runs on your machines with a local model and a local vector store. No document, claim or answer is sent anywhere else.',
  },
  {
    title: 'Evidence before score',
    body: 'A trust score is only shown next to the hashes, diffs and contradictions that produced it.',
  },
  {
    title: 'Every output traceable',
    body: 'Any answer can be walked back to the exact passage, version and hash it came from.',
  },
];
