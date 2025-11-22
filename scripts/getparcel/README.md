# getparcel (TypeScript)

Node/TypeScript port of `scripts/getparcel.sh` that uses viem for all chain
interactions. The CLI keeps the same inputs/outputs and adds friendlier parsing
for status names and canvas decimals.

## Setup

```bash
cd scripts/getparcel
npm install
```

`ETH_RPC_URL` is used if set; otherwise the script defaults to
`https://ethereum-rpc.publicnode.com`. Requires Node 20+.

## Usage

```bash
npm run getparcel -- <tokenId> [options]
# or
npx tsx src/index.ts <tokenId> [options]
```

Key options (mirrors the original script):
- `-m, --method tokenHTML|tokenSVG` (default `tokenHTML`)
- `-v, --version <idx>` optional renderer index (defaults to on-chain mapping)
- `-e, --seed <n>` (default `10196`)
- `-d, --decay <n>` (default `0`)
- `-s, --status <name>` one of `terrain`, `daydream`, `terraformed`, `origin-daydream`, `origin-terraformed` (aliases `od`/`ot`)
- `-c, --canvas <decimals>` override canvas as a 1024-character decimal string (no hex/commas)
- `-o, --output <file>` (`-` for stdout; default `tmp/${tokenId}-v<version>-<status>.html`)
- `-n, --dry-run` resolve inputs only; add `--show-canvas` to print all rows
- `--rpc-url <url>` override RPC endpoint

Examples:

```bash
# Fetch current HTML for token 1
npm run getparcel -- 1

# Dry-run with canvas override
npm run getparcel -- 5308 --status terraformed --version 2 --canvas "<1024 decimals>" --dry-run --show-canvas
```
