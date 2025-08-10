### Terraforms Contracts Documentation

---

### Terraforms — `src/Terraforms.sol`
- **Public/External**
  - `constructor(address _terraformsDataAddress, address _terraformsAugmentationsAddress)`
  - `receive()` / `fallback()`
  - `mint(uint numTokens) payable nonReentrant publicMint`: Public sale mint (max 10 per tx; respects pause).
  - `earlyMint(uint numTokens) payable nonReentrant publicMint`: Early mint for Loot or mintpass holders; wallet limit 100 during early.
  - `redeemMintpass() nonReentrant`: Redeem one Unused mintpass; increments `dreamers`; marks token OriginDaydream.
  - `ownerClaim(address to, uint numTokens) onlyOwner`: Claim owner allotment after public supply is sold.
  - `tokenURI(uint256 tokenId) view`: Prereveal → `prerevealURI`; post-reveal → delegated to active tokenURI module with status/placement/seed/decay/canvas.
  - `tokenHTML(uint tokenId) view postReveal`: HTML with plaintext SVG via active tokenURI module.
  - `tokenSVG(uint tokenId) view postReveal`: Plaintext SVG via active tokenURI module.
  - `tokenCharacters(uint tokenId) view postReveal`: 32×32 characters via active tokenURI module.
  - `tokenTerrainValues(uint tokenId) view postReveal`: 32×32 int terrain values via active tokenURI module.
  - `tokenHeightmapIndices(uint tokenId) view postReveal`: 32×32 uint indices via active tokenURI module.
  - `structureData(uint timestamp) view`: 20-level array of structure coordinates (seed offset removed).
  - `tokenSupplementalData(uint tokenId) view postReveal`: Returns `TokenData` with spatial info, zone, charset, coords, elevation (seed offset removed).
  - `setTokenURIAddress(uint[] tokens, uint index)`: Token owner sets per-token tokenURI module index.
  - `addTokenURIAddress(address newAddress) onlyOwner`: Append new opt-in tokenURI implementation address.
- **Modifiers**
  - `publicMint(uint numTokens)`: Validates purchase amount, supply and price.
  - `postReveal(uint tokenId)`: Requires reveal and token existence.
- **Internal/Private**
  - `_mintTokens(address to, uint numTokens)`: Shuffle placement, increment counter, `_safeMint` loop.
  - `_yearsOfDecay(uint timestamp) view`: Decay years based on reveal time and dreamers count.

---

### TerraformsPlacements — `src/TerraformsPlacements.sol` (inherited by `Terraforms.sol`)
- **Public/External**
  - `setSeed()`: Finalize pseudorandom `seed` once supply minted or after one week; emits `TokensRevealed`.
- **Internal/Private**
  - `_shufflePlacements()`: Fisher–Yates-like placement shuffler; assigns `tokenToPlacement[tokenId]`.

---

### TerraformsDreaming — `src/TerraformsDreaming.sol` (inherited by `Terraforms.sol`)
- **Public/External**
  - `enterDream(uint tokenId)`: Owner flips token to Daydream/OriginDaydream; increments `dreamers` on first entry; emits `Daydreaming`.
  - `authorizeDreamer(uint tokenId, address authorizedDreamer)`: Grant canvas commit authorization; revoked on transfer.
  - `commitDreamToCanvas(uint tokenId, uint[16] dream)`: Owner/authorized commits canvas data; flips to Terraformed/OriginTerraformed; emits `Terraformed`.
- **Internal/Private**
  - `_beforeTokenTransfer(address from, address to, uint256 tokenId) override`: Revokes `tokenToAuthorizedDreamer` on transfer.

---

### TerraformsAdmin — `src/TerraformsAdmin.sol` (inherited by `Terraforms.sol`)
- **Public/External**
  - `togglePause() onlyOwner`: Toggle public sale.
  - `toggleEarly() onlyOwner`: Toggle early mint.
  - `setMintpassHolders(address[] mintpassHolders) onlyOwner`: Mark addresses as `Mintpass.Unused`.
  - `withdraw() onlyOwner`: Transfer balance to owner.

---

### TerraformsData (v1) — `src/TerraformsData.sol`
- **Public/External**
  - `fallback()` / `receive()`
  - `prerevealURI(uint tokenId) view`: Base64 JSON with prereveal SVG.
  - `tokenURI(uint tokenId, uint status, uint placement, uint seed, uint decay, uint[] canvas) view`: Full JSON; inline SVG/JS or external URLs.
  - `tokenSVG(uint status, uint placement, uint seed, uint decay, uint[] canvas) view`: Assembled animated SVG.
  - `tokenHTML(uint status, uint placement, uint seed, uint decay, uint[] canvas) view`: HTML with SVG.
  - `tokenCharacters(uint status, uint placement, uint seed, uint decay, uint[] canvas) view`: 32×32 characters (space for background).
  - `tokenTerrain(uint placement, uint seed, uint decay) view`: 32×32 Perlin values.
  - `tokenHeightmapIndices(uint status, uint placement, uint seed, uint decay, uint[] canvas) view`: 32×32 height indices; terrain or dream canvas.
  - `tileOrigin(uint level, uint tile, uint seed, uint decay, uint timestamp) view returns (int,int,int)`
  - `xOrigin(uint level, uint tile, uint seed) view returns (int)`
  - `yOrigin(uint level, uint tile, uint seed) view returns (int)`
  - `zOrigin(uint level, uint tile, uint seed, uint decay, uint timestamp) view returns (int)`
  - `tokenElevation(uint level, uint tile, uint seed) view returns (int)`
  - `tokenZone(uint placement, uint seed) view returns (string[10], string)`
  - `characterSet(uint placement, uint seed) view returns (string[9] charset, uint font, uint fontsize, uint index)`
  - `levelAndTile(uint placement, uint seed) view returns (uint level, uint tile)`
  - `zOscillation(uint level, uint decay, uint timestamp) view returns (int)`
  - `resourceLevel(uint placement, uint seed) view returns (uint)`
  - `setAnimationURL(string url) onlyOwner`
  - `setImageURL(string url) onlyOwner`
  - `setResourceName(string name) onlyOwner`
  - `setResourceAddress(address contractAddress) onlyOwner`
  - `withdraw() onlyOwner`
- **Internal/Private**
  - `perlinPlacement(uint level, uint tile, uint seed, int scale) view returns (int)`
  - `heightmapIndexFromTerrainValue(int terrainValue) view returns (uint)`
  - `resourceDirection() view returns (int)`
  - `charsFromHeighmapIndices(uint[32][32], string[9]) pure returns (string[32][32])`
  - `getActivation(uint placement, uint seed) pure returns (ITerraformsSVG.Activation)`
  - `reverseUint(uint i) pure returns (uint)`
  - `rotatePlacement(uint placement, uint seed) pure returns (uint)`
  - `svgParameters(...) view returns (ITerraformsSVG.SVGParams)`
  - `animationParameters(uint placement, uint seed) view returns (ITerraformsSVG.AnimParams)`

---

### TerraformsData_v2_0 (v2) — `src/TerraformsData_v2_0.sol`
- **Public/External**
  - `constructor()` / `initialize(address helpers, address tokenURI)`
  - `tokenURI(uint256 tokenId, uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `tokenSVG(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `tokenHTML(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `tokenCharacters(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `antennaPhoto(uint256 tokenId) view returns (string)`
  - `concatenateArrayOfStrings(string[32]) pure returns (string)`
  - `generateTokenCharacterArray(string[9], uint[32][32]) view returns (string[32][32])`
  - `tokenTerrain(uint256 placement, uint256 seed, uint256 decay) view`
  - `tokenHeightmapIndices(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `tileOrigin(uint256 level, uint256 tile, uint256 seed, uint256 decay, uint256 timestamp) view returns (int256, int256, int256)`
  - `xOrigin(uint256 level, uint256 tile, uint256 seed) view returns (int256)`
  - `yOrigin(uint256 level, uint256 tile, uint256 seed) view returns (int256)`
  - `zOrigin(uint256 level, uint256 tile, uint256 seed, uint256 decay, uint256 timestamp) view returns (int256)`
  - `tokenElevation(uint256 level, uint256 tile, uint256 seed) view returns (int256)`
  - `tokenZone(uint256 placement, uint256 seed) view returns (string[10], string)`
  - `characterSet(uint256 placement, uint256 seed) view returns (string[9], uint256, uint256, uint256)`
  - `biomeCode(uint256 tokenId) view returns (string[9])`
  - `biomeIndex(uint256 tokenId) view returns (uint256)`
  - `chroma(uint256 tokenId) view returns (string)`
  - `resourceLevel(uint256 tokenId) view returns (uint256)` / `resourceLevel(uint256 placement, uint256 seed) view returns (uint256)`
  - `levelAndTile(uint256 placement, uint256 seed) view returns (uint256, uint256)`
  - `zOscillation(uint256 level, uint256 decay, uint256 timestamp) view returns (int256)`
  - `heightmapIndexFromTerrainValue(int256 terrainValue) view returns (uint256)`
  - `resourceName() view returns (string)`
  - `lock() onlyOwner notLocked`
  - `withdraw() onlyOwner`
  - `fallback()` / `receive()` delegate to v0 data address
- **Internal/Private**
  - `_authorizeUpgrade(address) onlyOwner notLocked`
  - `_delegate()`

---

### TerraformsTokenURI_v2_0 (v2) — `src/TerraformsTokenURI_v2_0.sol`
- **Public/External**
  - `constructor()` / `initialize(address svg, address helpers, address beacon)`
  - `setAttunement(uint256 tokenId, int attunement)`: Owner sets attunement for placement; emits `AttunementSet`.
  - `tokenURI(uint256 tokenId, uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `tokenHTML(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `tokenSVG(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view`
  - `staticAntennaImage(SVGParams p, AnimParams a) view returns (string)`
  - `tokenToAttunement(uint256 tokenId) view returns (int)`
  - `svgParameters(uint256 status, uint256 placement, uint256 seed, uint256 decay, uint256[] canvas) view returns (SVGParams)`
  - `animationParameters(uint256 placement, uint256 seed) view returns (AnimParams)`
  - `antennaHeightmap(uint seed) view returns (uint256[32][32])`
  - `hypotenuse(int256 x1, int256 x2, int256 y2) pure returns (SD59x18)`
  - `radialDistance(SD59x18 dist, uint seed) view returns (uint256)`
  - `setAnimationURL(string) onlyOwner notLocked`
  - `setImageURL(string) onlyOwner notLocked`
  - `setDrive(uint _kairoDrive, uint _chronoDrive) onlyOwner notLocked`
  - `setTerraformsDataAddress(address) onlyOwner notLocked`
  - `lock() onlyOwner notLocked`
- **Internal/Private**
  - `_authorizeUpgrade(address) onlyOwner notLocked`

---

### TerraformsHelpers_v2_0 (v2) — `src/TerraformsHelpers_v2_0.sol`
- **Public/External**
  - `constructor()` / `initialize()`
  - `resourceDirection() view returns (int256)`
  - `perlinPlacement(uint level, uint tile, uint seed, int scale) view returns (int)`
  - `getActivation(uint256 placement, uint256 seed) pure returns (Activation)`
  - `reverseUint(uint256 i) pure returns (uint256)`
  - `rotatePlacement(uint256 placement, uint256 seed) view returns (uint256)`
  - `addressToString(address addr) pure returns (string)`
  - `addressToENS(address addr) view returns (string)`
  - `structureDecay(uint256 timestamp) view returns (uint256)`
  - `zOrigin(uint256 level, uint256 tile, uint256 seed, uint256 decay, uint256 timestamp) view returns (int256)`
  - `calculateSeed(uint level, uint tile) pure returns (uint)`
  - `zOscillation(uint256 level, uint256 decay, uint256 timestamp) view returns (int256)`
  - `lock() onlyOwner notLocked`
- **Internal/Private**
  - `_authorizeUpgrade(address) onlyOwner notLocked`

---

### TerraformsBeacon_v2_0 (v2) — `src/TerraformsBeacon_v2_0.sol`
- **Public/External**
  - `constructor()` / `initialize(string _scriptLibrary, string _scriptBody, string _scriptUI, string _scriptLoopStart, string _scriptLoopEnd)`
  - `turnAntennaOn(uint256 tokenId)`
  - `turnAntennaOff(uint256 tokenId)`
  - `saveConnectionToCurrentSatellite(uint256 tokenId)`
  - `tuneToCapturedSatelliteConnection(uint256 tokenId, uint256 index)`
  - `getAntennaStatus(uint256 tokenId) view returns (AntennaStatus)`
  - `getFirstAntennaModification(uint256 tokenId) view returns (AntennaModificationRecord)`
  - `getLastAntennaModification(uint256 tokenId) view returns (AntennaModificationRecord)`
  - `getAntennaModificationAtIndex(uint256 tokenId, uint256 index) view returns (AntennaModificationRecord)`
  - `getNumberOfAntennaModifications(uint256 tokenId) view returns (uint256)`
  - `getCurrentBroadcastIndex() view returns (int256)`
  - `getBroadcastCycleDuration() view returns (uint256)`
  - `getCoreScript(uint tokenId) view returns (string)`
  - `getParcelCode(uint256 tokenId) view returns (AntennaStatus, string)`
  - `getParcelCodeFromPlacement(uint256 placement) view returns (AntennaStatus, string)`
  - `assembleScriptVars(uint tokenId) view returns (string)`
  - `addBroadcast(address satellite, uint256 duration) onlyOwner`
  - `removeLastBroadcast() onlyOwner`
  - `modifyBroadcast(uint256 index, address satellite, uint256 duration) onlyOwner`
  - `modifyBroadcastOrder(uint256[] order) onlyOwner`
  - `setScriptLibrary(uint index, string scriptLibrary) onlyOwner`
  - `setScriptFont(uint index, string scriptFont) onlyOwner`
  - `setScriptExtra1(uint index, string scriptExtra1) onlyOwner`
  - `setScriptBody(uint index, string scriptBody) onlyOwner`
  - `setScriptUI(uint index, string scriptUI) onlyOwner`
  - `setScriptExtra2(uint index, string scriptExtra2) onlyOwner`
  - `setScriptLoopStart(uint index, string scriptLoopStart) onlyOwner`
  - `setScriptLoopEnd(uint index, string scriptLoopEnd) onlyOwner`
  - `setDefaultScriptComponentIndices(uint256[8] indices) onlyOwner`
- **Internal/Private**
  - `_authorizeUpgrade(address) onlyOwner`

---

### TerraformsSVG — `src/TerraformsSVG.sol`
- **Public/External**
  - `constructor(address _terraformsCharactersAddress)`
  - `makeSVG(SVGParams p, AnimParams a) view returns (string svgMain, string animations, string script)`
  - `setJS(string js) onlyOwner`: Update embedded JavaScript; requires not locked.
  - `lock() onlyOwner`
- **Internal/Private**
  - `generateCSSColors(string[10] colors) view returns (string)`
  - `generateAnimations(AnimParams a, string[10] colors) view returns (string)`
  - `setBackgroundAnimation(AnimParams a) pure returns (string)`
  - `setForegroundAnimation(AnimParams a, uint class, uint multiplier) view returns (string)`
  - `setCSSColor(string class, string color) pure returns (string)`
  - `setKeyframes(Activation activation, string[10] colors, string[2] altColors) pure returns (string)`
  - `generateScript(SVGParams p) view returns (string)`

---

### TerraformsCharacters — `src/TerraformsCharacters.sol`
- **Public/External**
  - `addFont(uint id, string base64) onlyOwner`
  - `font(uint id) view returns (string)`
  - `characterSet(uint index) view returns (string[9], uint fontId)`

---

### TerraformsAugmentations — `src/TerraformsAugmentations.sol`
- **Public/External**
  - `addAugmentation(string name) onlyOwner`
  - `addAugmentationVersion(uint augmentationId, address contractAddress, string contractABI) onlyOwner`
  - `listAugmentations() view returns (Augmentation[] memory)`
  - `getAugmentationVersion(uint augmentationId, uint version) view returns (AugmentationVersion memory)`

---

### TerraformsZones — `src/TerraformsZones.sol`
- **Public/External**
  - `tokenZone(uint index) view returns (string[10] colors, string name)`

---

### Libraries
- Base64 — `src/Base64.sol`
  - **Internal**: `encode(bytes data) pure returns (string)`
- ToString — `src/ToString.sol`
  - **Internal**: `toString(uint256 value) pure returns (string)`
- PerlinNoise — `src/PerlinNoise.sol`
  - **Public**: `noise2d(int256 x, int256 y) pure returns (int256)`, `noise3d(int256 x, int256 y, int256 z) pure returns (int256)`
  - **Internal**: `lerp`, `fade`, `grad2`, `grad3`, `ptable`, `ftable`

---

### Interfaces (selected) — `src/interfaces/`
- ITerraformsData / ITerraformsData_v0: data and geometry APIs consumed by tokenURI/Data.
- ITerraformsTokenURI: `tokenURI`, `tokenHTML`, `tokenSVG`, `durations(uint)`, `antennaHeightmap(uint)`.
- ITerraformsSVG: `makeSVG(SVGParams, AnimParams)`.
- ITerraformsHelpers: helper methods surfaced in v2.
- ITerraforms: main ERC721 getters: `dreamers()`, `ownerOf(uint)`, `tokenToDreamer(uint)`, `tokenToPlacement(uint)`, `tokenToStatus(uint)`.
- IBeacon: script retrieval for parcels.
- ISatellite: satellite broadcasting interface.
- ReverseRecords: ENS reverse lookup.

---

Notes
- OpenZeppelin inherited methods (e.g., `Ownable`, `ReentrancyGuard`, `ERC721Enumerable`) are not enumerated here; refer to OZ docs for full surfaces.
