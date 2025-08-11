## Terraforms by Mathcastles

- **X**: [@mathcastles](https://x.com/mathcastles) · [@0x113d](https://x.com/0x113d) · [@xaltgeist](https://x.com/xaltgeist)
- **Discord**: [discord.gg/mathcastles](https://discord.gg/mathcastles)
- **Website**: [mathcastles.xyz](https://mathcastles.xyz/)
- [Contract addresses](#contract-addresses)

### About this repo

This is unofficial/fan repo with Terraforms source code, useful tooling and documentation.

### Quick start (Foundry)

- clone repo
- init submodules:
```bash
git submodule update --init --recursive
```
- build:
```bash
forge build
```

### Project structure

```text
.
├── artifacts/
├── docs/
├── lib/
├── scripts/
└── src/
```

- **artifacts**: storage for pretty-formatted artifacts for quick access
  - **animation-v0.js**: animation script for V0 rendered token
  - **animation-v2.js**: animation script for V2 rendered token
  - **blades.js**: JSON dump of all blade patterns for each token
  - **response-tokenURI.json**: example JSON with tokenURI() response from the main contract
- **docs**: AI-generated documentation
  - **beacon.md**: Beacon/Satellite/Antenna system
  - **events.md**: all events Terraforms can emit (including V2)
  - **reference.md**: full public/private API reference
- **lib**: dependencies from OpenZeppelin and Forge standard libraries required for Terraforms compilation
- **script**
  - **tf_getparcel.sh**: handy script that can fetch a complete HTML for a parcel (current state or any variation)
- **src**: smart contracts
  - **interfaces/**: contract interfaces
  - **lib/**: shared libraries (e.g., `Base64.sol`, `ToString.sol`, `Types.sol`)
  - Key contracts: `Terraforms.sol`, `TerraformsData.sol`, `TerraformsSVG.sol`
  - V2 rendering and the Beacon system: `TerraformsData_v2_0.sol`, `TerraformsBeacon_v2_0.sol` (source for `TerraformsSVG_v2_0.sol` remains private so far)

### Use `scripts/tf_getparcel.sh` to fetch parcel's content

Requirements:
- [Foundry](https://github.com/foundry-rs/foundry) (`forge`, `cast`)
- `bc` or `dc` available (used for big-int decoding) - should be already available on all OS

You can control which JSON-RPC node to call with [$ETH_RPC_URL](scripts/tf_getparcel.sh#L1) (already set to a public node by default).

1. `source` the script:
```bash
source ./scripts/tf_getparcel.sh
```
2. Basic usage (fetch parcel #1 in the current state):
```bash
tf_getparcel 1
```
3. See full usage manual (can fetch any version, state, canvas):
```bash
tf_getparcel
```

### Contract addresses

When calling implementation ABIs, use the proxy address as the target; storage lives at the proxy.

#### Original
- [0x4E1f41613c9084FdB9E34E11fAE9412427480e56](https://etherscan.io/address/0x4E1f41613c9084FdB9E34E11fAE9412427480e56)
  - Terraforms
  - TerraformsAdmin
  - TerraformsDreaming
  - TerraformsPlacements
- [0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2](https://etherscan.io/address/0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2)
  - TerraformsData
  - TerraformsDataInterfaces
  - TerraformsDataStorage
- [0x49957Ca2F1E314c2cf70701816bf6283b7215811](https://etherscan.io/address/0x49957Ca2F1E314c2cf70701816bf6283b7215811)
  - TerraformsSVG
- [0xC9e417B7e67E387026161E50875D512f29630D7B](https://etherscan.io/address/0xC9e417B7e67E387026161E50875D512f29630D7B)
  - TerraformsCharacters
- [0x1BAa1a790De69893b48932a151ef9bdB914bFBAe](https://etherscan.io/address/0x1BAa1a790De69893b48932a151ef9bdB914bFBAe)
  - TerraformsZones (not verified on Etherscan due to a bug)
- [0x2521bEb44D433A5B916Ad9d5aB51B98378870072](https://etherscan.io/address/0x2521bEb44D433A5B916Ad9d5aB51B98378870072)
  - TerraformsAugmentations
- [0x53B811757fC725aB3556Bc00237D9bBcF2c0DfDE](https://etherscan.io/address/0x53B811757fC725aB3556Bc00237D9bBcF2c0DfDE)
  - PerlinNoise

#### V1
- TerraformsData_v1_0
  - Proxy: [0xB51A3bB80d50A3153C1b63B0E38FC200676f5bA5](https://etherscan.io/address/0xB51A3bB80d50A3153C1b63B0E38FC200676f5bA5)
  - Impl: [0xEF274e6b0cdE493D411E96A79451b7dd80b8c748](https://etherscan.io/address/0xEF274e6b0cdE493D411E96A79451b7dd80b8c748)
- TerraformsTokenURI_v1_0
  - Proxy: [0x5321227601455CbE80ef3cBa294A653ae6B806E8](https://etherscan.io/address/0x5321227601455CbE80ef3cBa294A653ae6B806E8)
  - Impl: [0xc62811036aBcb606E8cb21bd61865c4C22F1A8aF](https://etherscan.io/address/0xc62811036aBcb606E8cb21bd61865c4C22F1A8aF)
- TerraformsSVG_v1_0 (presumably; source not published yet)
  - Proxy: [0xdAEd2769F8F26bb32662216A864337a0E5C4A733](https://etherscan.io/address/0xdAEd2769F8F26bb32662216A864337a0E5C4A733)
  - Impl: [0xb23EefD968A796285C1F7208d244ecc3d6490DE1](https://etherscan.io/address/0xb23EefD968A796285C1F7208d244ecc3d6490DE1)
- TerraformsHelpers_v1_0
  - Proxy: [0xF04BFF7fa428211C80b136F4B92c119447DA6E95](https://etherscan.io/address/0xF04BFF7fa428211C80b136F4B92c119447DA6E95)
  - Impl: [0xc993Aa5C7f66b679981517ab6DcD0BF68dCF8675](https://etherscan.io/address/0xc993Aa5C7f66b679981517ab6DcD0BF68dCF8675)

#### V2
- TerraformsData_v2_0
  - Proxy: [0x8aF860C8F157F4E3B6A54913BFA6Bb96ab2605C2](https://etherscan.io/address/0x8aF860C8F157F4E3B6A54913BFA6Bb96ab2605C2)
  - Impl: [0xEFf6c0A4E8FFD74bb53a8ca65C68a30BA85E6c2D](https://etherscan.io/address/0xEFf6c0A4E8FFD74bb53a8ca65C68a30BA85E6c2D)
- TerraformsTokenURI_v2_0
  - Proxy: [0xfcA647387E28e73E291DD90e7b09fA32bCBB2604](https://etherscan.io/address/0xfcA647387E28e73E291DD90e7b09fA32bCBB2604)
  - Impl: [0x0CE833EE4d97CEDc22bBf3B85c04b1fd9Ac5AbDd](https://etherscan.io/address/0x0CE833EE4d97CEDc22bBf3B85c04b1fd9Ac5AbDd)
- TerraformsBeacon_v2_0
  - Proxy: [0x331512A28A4cF80221aF949B5d43041fF0FC7f01](https://etherscan.io/address/0x331512A28A4cF80221aF949B5d43041fF0FC7f01)
  - Impl: [0x08C57779C239409e8244916eF1471241556444b8](https://etherscan.io/address/0x08C57779C239409e8244916eF1471241556444b8)
- TerraformsSVG_v2_0 (presumably; source not published yet)
  - Proxy: [0x6aAc2884572A881e5F08c04e889909CD38a66145](https://etherscan.io/address/0x6aAc2884572A881e5F08c04e889909CD38a66145)
  - Impl: [0x14863e732017e030a6e4E1667941d09a7553F632](https://etherscan.io/address/0x14863e732017e030a6e4E1667941d09a7553F632)
- TerraformsHelpers_v2_0
  - Proxy: [0xD4E7191539C4458f37EDFD0F03338672426f9598](https://etherscan.io/address/0xD4E7191539C4458f37EDFD0F03338672426f9598)
  - Impl: [0x95dbffA83B523512e1AF1a127b2388D302130F9e](https://etherscan.io/address/0x95dbffA83B523512e1AF1a127b2388D302130F9e)
