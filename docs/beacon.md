## Terraforms Beacon v2.0 — Antenna and Broadcast System

This document explains how the beacon/antenna system works in `src/TerraformsBeacon_v2_0.sol`.

### Concepts and Behavior
- Entities and roles:
  - Beacon: orchestrates rotation, records captures/tunes, and serves parcel code.
  - Satellite (contract): implements `isBroadcasting()`, `capture(uint256)`, `getBroadcast(uint256)`.
  - Parcel (token): owns antenna state and saved connections.
- Antenna states: Off, On, ConnectedToSatellite. One active saved connection per parcel via `parcelToActiveSatelliteConnectionIndex`; many saved connections possible.
- Single active broadcast (rotation): At any moment there is at most one active broadcast globally. The beacon iterates over satellites with `isBroadcasting() == true` in `broadcastOrder`, allocating wall-clock slices equal to each entry’s `duration`. If no satellites are broadcasting, there is no active broadcast.
- Code selection (decision tree):
  - Off → core script.
  - ConnectedToSatellite (tuned) → that satellite’s `getBroadcast(tokenId)`.
  - On (not tuned) → current active satellite’s broadcast if any; otherwise core script.
- Capture model: Capturing saves the satellite address and a timestamp (not the broadcast content). Saved connections persist and can be re-tuned later; duplicates are allowed; there is no prune/delete in this contract.
- When tuned (details):
  - Status becomes `ConnectedToSatellite`; active saved index stored in `parcelToActiveSatelliteConnectionIndex[tokenId]`.
  - Rotation and `isBroadcasting()` are ignored for tuned parcels; `getParcelCode` calls the saved satellite’s `getBroadcast(tokenId)` directly.
  - Turning Off does not clear saved connections; while Off, core script is served.
  - `saveConnectionToCurrentSatellite` emits `ParcelModified(..., TunedToCapturedSatelliteConnection)` and then tuning emits the same event again (two events is current behavior).
  - Immediate re-tune to the same satellite is blocked by comparing to the last modification only.
  - If the satellite’s `getBroadcast` reverts or changes behavior later, errors/changes surface when fetching parcel code (capture is not a snapshot).
- Scope notes: Satellite-specific logic for `capture`/`getBroadcast` is implementation-defined and out of scope here.

### API Reference

### Key Data Structures
- `enum AntennaStatus` (from `Types.sol`): Off, On, ConnectedToSatellite.
- `struct Broadcast { address satellite; uint256 duration; }`
- `struct CapturedSatelliteConnection { address satellite; uint256 timestamp; }`
- `struct AntennaModificationRecord { AntennaModification modification; address satellite; uint256 timestamp; }`
- `Broadcast[] broadcasts`: List of configured broadcasts.
- `uint256[] broadcastOrder`: Rotation order (indices into `broadcasts`).
- `mapping(uint256 => AntennaStatus) parcelToAntennaStatus`: Antenna state per token.
- `mapping(uint256 => CapturedSatelliteConnection[]) parcelToCapturedSatelliteConnections`: Saved connections per token.
- `mapping(uint256 => uint256) parcelToActiveSatelliteConnectionIndex`: Active saved-connection index per token.
- `mapping(uint256 => AntennaModificationRecord[]) parcelToAntennaMods`: Change history per token.
- `mapping(uint256 => uint256) placementToParcelId`: First-time mapping from placement → tokenId.

### Antenna Lifecycle
- `turnAntennaOn(tokenId)`
  - Only token owner; disallowed if `ITerraforms.tokenToStatus(tokenId) == Status.Terrain`.
  - If first modification for this token, stores `placementToParcelId[tokenPlacement] = tokenId`.
  - Sets status to `On` and appends a `TurnedAntennaOn` record.
- `turnAntennaOff(tokenId)`
  - Only token owner; requires not already `Off`.
  - Sets status to `Off` and appends a `TurnedAntennaOff` record.

#### History helpers
- `getFirstAntennaModification(tokenId)` / `getLastAntennaModification(tokenId)`
- `getAntennaModificationAtIndex(tokenId, index)`
- `getNumberOfAntennaModifications(tokenId)`

### Capturing and Tuning to Satellites
- `saveConnectionToCurrentSatellite(tokenId)`
  - Only owner and antenna not `Off`.
  - Finds current broadcasting satellite via `getCurrentBroadcastIndex()`.
  - Calls `ISatellite(b.satellite).capture(tokenId)`.
  - Saves the `(satellite, timestamp)` in `parcelToCapturedSatelliteConnections[tokenId]`.
  - Appends a `CapturedSatelliteConnection` mod record.
  - Immediately calls `tuneToCapturedSatelliteConnection` to tune to the new saved connection.
- `tuneToCapturedSatelliteConnection(tokenId, index)`
  - Only owner, antenna not `Off`, and `index` in range.
  - Prevents redundant re-tune to the same satellite if already tuned.
  - Sets `parcelToActiveSatelliteConnectionIndex[tokenId]` and switches status to `ConnectedToSatellite`.
  - Appends a `TunedToCapturedSatelliteConnection` record.

### Broadcast Rotation
- Each broadcast has a `satellite` and `duration`.
- `broadcastOrder` defines the rotation order over `broadcasts` indices.
- A satellite contributes to the active cycle only if `ISatellite(satellite).isBroadcasting()` is true.
- `getBroadcastCycleDuration()` sums durations of all broadcasting entries in order.
- `getCurrentBroadcastIndex()` maps current time into the active cycle using modulo arithmetic:
  - If total active cycle is 0, returns -1 (no active broadcasts).
  - Otherwise, returns the index into `broadcasts` for the active slot given `broadcastOrder`.

### Parcel Code Resolution
- `getParcelCode(tokenId) returns (AntennaStatus status, string parcelCode)`
  - If `status == Off`: returns the core script via `getCoreScript(tokenId)`.
  - Else if `status == ConnectedToSatellite`: returns the tuned saved satellite’s `getBroadcast(tokenId)`.
  - Else if a broadcast is currently active: returns that satellite’s `getBroadcast(tokenId)`.
  - Else: falls back to the core script.
- `getParcelCodeFromPlacement(placement)` uses `placementToParcelId` to delegate to `getParcelCode`.

### Core Script Composition
- `getCoreScript(tokenId)` builds a JavaScript string from components:
  - `assembleScriptVars(tokenId)`: prepends `let ATIME=<firstOnTimestamp>; let TIME=<block.timestamp>;`.
  - `getFont(index)`: injects a CSS `@font-face` for `MathcastlesRemix-Extra`, using stored `scriptFonts[index]` or fallback to `ITerraformsCharacters(...).font(0)` if empty.
  - Concatenates script components: library/body/UI/loop parts and an extra mutation line.

#### Script Components and Defaults
- Component maps: `scriptLibraries`, `scriptFonts`, `scriptExtras1`, `scriptBodies`, `scriptUIs`, `scriptExtras2`, `scriptLoopStarts`, `scriptLoopEnds` with counts `nScript*`.
- Admin setters: `setScriptLibrary`, `setScriptFont`, `setScriptExtra1`, `setScriptBody`, `setScriptUI`, `setScriptExtra2`, `setScriptLoopStart`, `setScriptLoopEnd`.
- `setDefaultScriptComponentIndices(uint256[8] indices)` documents order as:
  - `[library, font, extra1, body, UI, extra2, loopStart, loopEnd]`.

##### Note on index ordering in getCoreScript
- Current implementation uses `indices[0]` as font and `indices[1]` as library, uses the UI index for `loopStart`, and uses `indices[4]` for `loopEnd`.
- This differs from the docstring order above and may be unintentional. Either:
  - Provide indices in the currently used (swapped) order, or
  - Update `getCoreScript` to align with the documented order.

### Admin Operations
- Broadcast management:
  - `addBroadcast(address satellite, uint256 duration)`
  - `removeLastBroadcast()`
  - `modifyBroadcast(uint256 index, address satellite, uint256 duration)`
  - `modifyBroadcastOrder(uint256[] calldata order)`
- Script component management:
  - `setScriptLibrary`, `setScriptFont`, `setScriptExtra1`, `setScriptBody`, `setScriptUI`, `setScriptExtra2`, `setScriptLoopStart`, `setScriptLoopEnd`
  - `setDefaultScriptComponentIndices(uint256[8] indices)`

### Events
- `ParcelModified(uint256 tokenId, AntennaModification modification)`
- `BroadcastAdded(address satellite, uint256 duration)`
- `BroadcastRemoved(address satellite)`
- `BroadcastModified(address satellite, uint256 duration)`
- `BroadcastOrderModified(uint256[] order)`
- `ScriptComponentModified(ScriptComponent componentType, uint256 index)`

### Initialization and Constants
- `initialize(...)`:
  - Sets `version = "Version 2.0"`.
  - Binds `terraforms` to main ERC-721 at `0x4E1f41613c9084FdB9E34E11fAE9412427480e56`.
  - Sets `MAX_SUPPLY = 11104` and seeds component index 0 for library/body/UI/loop parts.
- Upgradeability/ownership via OpenZeppelin (`Initializable`, `UUPSUpgradeable`, `OwnableUpgradeable`).

### Interfaces and External Contracts
- `ITerraforms`: ownership, placement, and status checks; used for owner gating and Terrain restriction.
- `ISatellite`: `isBroadcasting()`, `capture(tokenId)`, `getBroadcast(tokenId)`.
- `ITerraformsCharacters`: font fallback at `0xC9e417B7e67E387026161E50875D512f29630D7B`.

### Access Control and Validations
- Owner-only where specified (admin functions); antenna actions restricted to token owner.
- Validations include:
  - Terrain parcels cannot turn antenna on.
  - Prevent turning on when already on / turning off when already off.
  - Disallow captures when no active broadcasts.
  - Index bounds checks for saved connections and broadcast edits.

### Query Helpers
- `getAntennaStatus(tokenId)`
- `getParcelCode(tokenId)` / `getParcelCodeFromPlacement(placement)`
- History functions described above 

 