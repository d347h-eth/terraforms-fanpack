### Terraforms Contract Events Documentation

#### Main contracts

##### TerraformsPlacements.sol
- `TokensRevealed(uint timestamp, uint seed)` — `src/TerraformsPlacements.sol:15`
  - Emitted when the seed is set to finalize token placement randomization

##### TerraformsDreaming.sol
- `Daydreaming(uint tokenId)` — `src/TerraformsDreaming.sol:32`
  - Emitted when a token permanently enters dreaming mode
- `Terraformed(uint tokenId, address terraformer)` — `src/TerraformsDreaming.sol:33`
  - Emitted when a dreaming token is terraformed with user-supplied canvas data

##### Terraforms.sol
- `Daydreaming(uint tokenId)` — `src/Terraforms.sol:159`
  - Emitted when redeeming a mintpass for a dreaming token

#### v2 contracts

##### TerraformsBeacon_v2_0.sol
- `ParcelModified(uint256 tokenId, AntennaModification modification)` — `src/TerraformsBeacon_v2_0.sol:88`
  - Emitted when a parcel's antenna is modified (turned on/off, tuned to satellite)
- `BroadcastAdded(address satellite, uint256 duration)` — `src/TerraformsBeacon_v2_0.sol:89`
  - Emitted when a new satellite broadcast is added
- `BroadcastRemoved(address satellite)` — `src/TerraformsBeacon_v2_0.sol:90`
  - Emitted when a satellite broadcast is removed
- `BroadcastModified(address satellite, uint256 duration)` — `src/TerraformsBeacon_v2_0.sol:91`
  - Emitted when an existing satellite broadcast is modified
- `BroadcastOrderModified(uint256[] order)` — `src/TerraformsBeacon_v2_0.sol:92`
  - Emitted when the broadcast order is changed
- `ScriptComponentModified(ScriptComponent componentType, uint256 index)` — `src/TerraformsBeacon_v2_0.sol:93`
  - Emitted when script components are modified (libraries, fonts, bodies, etc.)

##### TerraformsTokenURI_v2_0.sol
- `AttunementSet(uint256 indexed tokenId, int256 attunement)` — `src/TerraformsTokenURI_v2_0.sol:30`
  - Emitted when a token owner sets their token's attunement (homeostasis, activated, or retrograde)

#### Inherited events (from OpenZeppelin)

The contracts also inherit standard ERC-721 and Ownable events:
- `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`
- `Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)`
- `ApprovalForAll(address indexed owner, address indexed operator, bool approved)`
- `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`

#### Summary

- Main contracts: 4 unique events (`TokensRevealed`, `Daydreaming`, `Terraformed`)
- v2 contracts: 7 unique events (`ParcelModified`, `BroadcastAdded`, `BroadcastRemoved`, `BroadcastModified`, `BroadcastOrderModified`, `ScriptComponentModified`, `AttunementSet`)
- Total unique events: 11 custom events + standard ERC-721/Ownable events
