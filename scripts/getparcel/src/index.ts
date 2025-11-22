import { Command } from 'commander';
import {
  Address,
  Hex,
  PublicClient,
  createPublicClient,
  getAddress,
  hexToBigInt,
  keccak256,
  maxUint256,
  padHex,
  toHex,
  concatHex,
  http,
} from 'viem';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

type Method = 'tokenHTML' | 'tokenSVG';

type StatusKey =
  | 'terrain'
  | 'daydream'
  | 'terraformed'
  | 'originDaydream'
  | 'originTerraformed';

type StatusResolution = {
  value: bigint;
  label: string;
  slug: string;
  source: 'override' | 'live';
};

type VersionResolution = {
  value: bigint;
  source: 'override' | 'live';
};

type CanvasResolution = {
  rows: bigint[];
  source: 'override' | 'live' | 'zeroed';
};

const DEFAULT_RPC_URL =
  process.env.ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com';
const TERRAFORMS_ADDRESS =
  '0x4e1f41613c9084fdb9e34e11fae9412427480e56' as const;
const TOKEN_TO_URI_SLOT = 11128n; // tokenToURIAddressIndex mapping slot on the proxy
const CANVAS_ROW_COUNT = 16;
const DEFAULT_SEED = 10196n;
const DEFAULT_DECAY = 0n;

const STATUS_CONFIG: Record<
  StatusKey,
  { value: bigint; slug: string; label: string; aliases: string[] }
> = {
  terrain: {
    value: 0n,
    slug: 'terrain',
    label: 'Terrain',
    aliases: ['terrain', 't', 'default', '0'],
  },
  daydream: {
    value: 1n,
    slug: 'daydream',
    label: 'Daydream',
    aliases: ['daydream', 'dream', '1', 'dd'],
  },
  terraformed: {
    value: 2n,
    slug: 'terraformed',
    label: 'Terraformed',
    aliases: ['terraformed', 'tf', '2'],
  },
  originDaydream: {
    value: 3n,
    slug: 'od',
    label: 'OriginDaydream',
    aliases: ['origindaydream', 'od', 'origin-daydream', '3'],
  },
  originTerraformed: {
    value: 4n,
    slug: 'ot',
    label: 'OriginTerraformed',
    aliases: [
      'originterraformed',
      'ot',
      'origin-terraformed',
      'origin-terraform',
      '4',
    ],
  },
};

const STATUS_BY_VALUE: Record<string, StatusKey> = Object.entries(
  STATUS_CONFIG,
).reduce<Record<string, StatusKey>>((acc, [key, meta]) => {
  acc[meta.value.toString()] = key as StatusKey;
  return acc;
}, {});

const terraformsAbi = [
  {
    name: 'tokenURIAddresses',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: '' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'tokenToPlacement',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: '' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'tokenToStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: '' }],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'tokenToCanvasData',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'uint256', name: '' },
      { type: 'uint256', name: '' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies readonly unknown[];

const rendererAbi = [
  {
    name: 'tokenHTML',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'uint256', name: 'status' },
      { type: 'uint256', name: 'placement' },
      { type: 'uint256', name: 'seed' },
      { type: 'uint256', name: 'decay' },
      { type: 'uint256[]', name: 'canvas' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'tokenSVG',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'uint256', name: 'status' },
      { type: 'uint256', name: 'placement' },
      { type: 'uint256', name: 'seed' },
      { type: 'uint256', name: 'decay' },
      { type: 'uint256[]', name: 'canvas' },
    ],
    outputs: [{ type: 'string' }],
  },
] as const satisfies readonly unknown[];

const STATUS_ALIAS_LOOKUP: Record<string, StatusKey> = Object.entries(
  STATUS_CONFIG,
).reduce<Record<string, StatusKey>>((acc, [key, meta]) => {
  meta.aliases.forEach((alias) => {
    acc[normalizeStatusInput(alias)] = key as StatusKey;
  });
  return acc;
}, {});

function normalizeStatusInput(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function parseUint(name: string, value: string | undefined, fallback: bigint) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return BigInt(value);
}

function parseMethod(value: string | undefined): Method {
  if (value === undefined || value === null || value === '') {
    return 'tokenHTML';
  }
  const normalized = value.trim();
  if (normalized === 'tokenHTML' || normalized === 'tokenSVG') {
    return normalized;
  }
  throw new Error('method must be tokenHTML or tokenSVG');
}

function statusFromInput(input: string): StatusResolution {
  const key = STATUS_ALIAS_LOOKUP[normalizeStatusInput(input)];
  if (!key) {
    throw new Error(
      `Unknown status "${input}". Use one of: ${Object.keys(STATUS_CONFIG).join(', ')}`,
    );
  }
  const meta = STATUS_CONFIG[key];
  return { value: meta.value, label: meta.label, slug: meta.slug, source: 'override' };
}

function statusFromChain(value: bigint): StatusResolution {
  const key = STATUS_BY_VALUE[value.toString()];
  if (!key) {
    return {
      value,
      label: `Unknown(${value})`,
      slug: `unknown-${value}`,
      source: 'live',
    };
  }
  const meta = STATUS_CONFIG[key];
  return { value, label: meta.label, slug: meta.slug, source: 'live' };
}

function isWithinUint256(value: bigint) {
  return value >= 0 && value <= maxUint256;
}

function canvasFromDecimalString(input: string): bigint[] {
  const cleaned = input.replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('Canvas override cannot be empty');
  }
  if (!/^\d+$/.test(cleaned)) {
    throw new Error('Canvas override must be a string of decimal digits (no commas or hex)');
  }

  const rows: bigint[] = [];
  let remaining = cleaned;
  while (remaining.length > 0 && rows.length < CANVAS_ROW_COUNT) {
    const chunk = remaining.slice(0, 64);
    remaining = remaining.slice(64);
    const value = BigInt(chunk);
    if (!isWithinUint256(value)) {
      throw new Error(`Canvas chunk exceeds uint256 at row ${rows.length}`);
    }
    rows.push(value);
  }
  if (remaining.length > 0) {
    throw new Error(
      `Canvas override is too long (expected up to ${CANVAS_ROW_COUNT * 64} digits)`,
    );
  }
  while (rows.length < CANVAS_ROW_COUNT) {
    rows.push(0n);
  }
  return rows;
}

async function resolveVersion(
  client: PublicClient,
  tokenId: bigint,
  override?: string,
): Promise<VersionResolution> {
  if (override !== undefined) {
    return { value: parseUint('version', override, 0n), source: 'override' };
  }
  const slot: Hex = keccak256(
    concatHex([
      padHex(toHex(tokenId), { size: 32 }),
      padHex(toHex(TOKEN_TO_URI_SLOT), { size: 32 }),
    ]),
  );
  const stored = await client.getStorageAt({ address: TERRAFORMS_ADDRESS, slot });
  const value = stored ? hexToBigInt(stored) : 0n;
  return { value, source: 'live' };
}

async function resolveDataAddress(
  client: PublicClient,
  versionIndex: bigint,
): Promise<Address> {
  const address = await client.readContract({
    address: TERRAFORMS_ADDRESS,
    abi: terraformsAbi,
    functionName: 'tokenURIAddresses',
    args: [versionIndex],
  });
  return getAddress(address as Address);
}

async function resolvePlacement(
  client: PublicClient,
  tokenId: bigint,
): Promise<bigint> {
  const placement = await client.readContract({
    address: TERRAFORMS_ADDRESS,
    abi: terraformsAbi,
    functionName: 'tokenToPlacement',
    args: [tokenId],
  });
  return placement as bigint;
}

async function resolveStatus(
  client: PublicClient,
  tokenId: bigint,
  override?: string,
): Promise<StatusResolution> {
  if (override) {
    return statusFromInput(override);
  }
  const value = await client.readContract({
    address: TERRAFORMS_ADDRESS,
    abi: terraformsAbi,
    functionName: 'tokenToStatus',
    args: [tokenId],
  });
  return statusFromChain(value as bigint);
}

async function resolveCanvas(
  client: PublicClient,
  tokenId: bigint,
  status: StatusResolution,
  override?: string,
): Promise<CanvasResolution> {
  if (override) {
    return { rows: canvasFromDecimalString(override), source: 'override' };
  }
  if (status.value === STATUS_CONFIG.terrain.value) {
    return {
      rows: Array.from({ length: CANVAS_ROW_COUNT }, () => 0n),
      source: 'zeroed',
    };
  }
  const rows = await Promise.all(
    Array.from({ length: CANVAS_ROW_COUNT }, (_, row) =>
      client
        .readContract({
          address: TERRAFORMS_ADDRESS,
          abi: terraformsAbi,
          functionName: 'tokenToCanvasData',
          args: [tokenId, BigInt(row)],
        })
        .then((value) => value as bigint)
        .catch(() => 0n),
    ),
  );
  return { rows, source: 'live' };
}

async function renderParcel(
  client: PublicClient,
  rendererAddress: Address,
  method: Method,
  args: {
    status: bigint;
    placement: bigint;
    seed: bigint;
    decay: bigint;
    canvas: bigint[];
  },
): Promise<string> {
  const result = await client.readContract({
    address: rendererAddress,
    abi: rendererAbi,
    functionName: method,
    args: [args.status, args.placement, args.seed, args.decay, args.canvas],
  });
  if (typeof result !== 'string') {
    throw new Error('Unexpected render response (expected string)');
  }
  return result;
}

function formatPreview(rows: bigint[], limit = 4): string {
  const slice = rows.slice(0, limit);
  return slice.map((row) => row.toString()).join(', ');
}

async function writeOutput(path: string, contents: string) {
  if (path === '-') {
    process.stdout.write(contents);
    return;
  }
  const dir = dirname(path);
  if (dir && dir !== '.' && dir !== '') {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, contents, 'utf8');
  console.log(`Saved to: ${path}`);
}

function defaultOutputPath(tokenId: bigint, version: bigint, status: StatusResolution) {
  return `tmp/${tokenId}-v${version}-${status.slug}.html`;
}

async function main() {
  const program = new Command();
  program
    .argument('<tokenId>', 'Token ID')
    .option('-m, --method <name>', 'tokenHTML (default) or tokenSVG')
    .option('-v, --version <idx>', 'Render index; defaults to on-chain mapping')
    .option('-e, --seed <number>', 'Seed (default 10196)', `${DEFAULT_SEED}`)
    .option('-d, --decay <number>', 'Decay (default 0)', `${DEFAULT_DECAY}`)
    .option(
      '-s, --status <status>',
      'terrain | daydream | terraformed | origin-daydream | origin-terraformed',
    )
    .option(
      '-c, --canvas <decimalString>',
      'Override canvas as 1024 decimal digits (no commas/hex)',
    )
    .option('-o, --output <file>', 'Output file (use "-" for stdout)')
    .option('-n, --dry-run', 'Resolve inputs and print them without rendering')
    .option('--show-canvas', 'With --dry-run, print all 16 canvas rows')
    .option('--rpc-url <url>', 'JSON-RPC URL (defaults to ETH_RPC_URL or public node)')
    .parse(process.argv);

  const opts = program.opts<{
    method?: string;
    version?: string;
    seed?: string;
    decay?: string;
    status?: string;
    canvas?: string;
    output?: string;
    dryRun?: boolean;
    showCanvas?: boolean;
    rpcUrl?: string;
  }>();

  const tokenIdInput = program.args[0];
  if (!tokenIdInput) {
    program.help();
    return;
  }
  const rpcUrl = opts.rpcUrl ?? DEFAULT_RPC_URL;
  const tokenId = parseUint('tokenId', tokenIdInput, 0n);
  const seed = parseUint('seed', opts.seed, DEFAULT_SEED);
  const decay = parseUint('decay', opts.decay, DEFAULT_DECAY);
  const method = parseMethod(opts.method);

  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const version = await resolveVersion(client, tokenId, opts.version);
  const rendererAddress = await resolveDataAddress(client, version.value);
  const placement = await resolvePlacement(client, tokenId);
  const status = await resolveStatus(client, tokenId, opts.status);
  const canvas = await resolveCanvas(client, tokenId, status, opts.canvas);

  const output = opts.output ?? defaultOutputPath(tokenId, version.value, status);

  if (opts.dryRun) {
    console.log('getparcel dry-run:');
    console.log(`  token_id        : ${tokenId}`);
    console.log(`  version         : ${version.value} (${version.source})`);
    console.log(`  mapping_addr    : ${TERRAFORMS_ADDRESS}`);
    console.log(`  data_addr       : ${rendererAddress}`);
    console.log(`  placement       : ${placement}`);
    console.log(
      `  status          : ${status.slug} (${status.value}) (${status.source === 'override' ? 'override' : 'live'})`,
    );
    console.log(
      `  canvas_len      : ${canvas.rows.length} (source: ${canvas.source})`,
    );
    if (opts.showCanvas) {
      canvas.rows.forEach((row, idx) => {
        console.log(`    [${idx}] ${row.toString()}`);
      });
    } else {
      console.log(`  canvas preview  : ${formatPreview(canvas.rows)}`);
    }
    console.log(`  selector        : ${method}`);
    console.log(`  seed, decay     : ${seed}, ${decay}`);
    console.log(`  output          : ${output}`);
    return;
  }

  const html = await renderParcel(client, rendererAddress, method, {
    status: status.value,
    placement,
    seed,
    decay,
    canvas: canvas.rows,
  });

  await writeOutput(output, html);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
