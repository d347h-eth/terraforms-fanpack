// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ITerraformsHelpers} from "./interfaces/ITerraformsHelpers.sol";
import {ITerraforms} from "./interfaces/ITerraforms.sol";
import {ITerraformsData_v0} from "./interfaces/ITerraformsData_v0.sol";
import {ITerraformsResource} from "./interfaces/ITerraformsResource.sol";
import {IPerlinNoise} from "./interfaces/IPerlinNoise.sol";
import {ReverseRecords} from "./interfaces/ReverseRecords.sol";
import {Activation} from "./lib/Types.sol";

/// @author xaltgeist, with code direction and consultation from 113
/// @title Helper functions for the Terraforms contract, version 1.0
contract TerraformsHelpers_v1_0 is
    ITerraformsHelpers,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    string public version;

    // Interfaces
    ITerraforms terraforms;
    ITerraformsData_v0 dataV0;

    // TokenURI info
    address public reverseRegistrar;

    // Visualization info
    uint256 public MAX_SUPPLY;
    uint256 public INIT_TIME;
    uint256 public TOKEN_DIMS;
    int256 public STEP;
    bool public isLocked;
    uint256 public deployTimestamp;

    // Contract may be locked to prevent further upgrades
    // Contract is locked automatically five years after the initial Terraforms deployment
    // Two years is 365 * 3 + 1 = 1096 days (2024 is a leap year)
    modifier notLocked() {
        require(isLocked == false, "Terraforms Helpers: Contract is locked");
        require(
            block.timestamp < deployTimestamp + 1096 days,
            "Terraforms Helpers: Contract is locked"
        );
        _;
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * INITIALIZER
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        version = "Version 1.0";
        deployTimestamp = block.timestamp;
        terraforms = ITerraforms(0x4E1f41613c9084FdB9E34E11fAE9412427480e56); // Main (ERC721) contract
        dataV0 = ITerraformsData_v0(0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2);
        reverseRegistrar = 0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C;
        INIT_TIME = 1639749125;
        TOKEN_DIMS = 32;
        STEP = 6619;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner notLocked {}

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * PUBLIC: TOKEN DATA
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @notice Determines the direction of a tokens' resource animation
    /// @dev Direction oscillates from 0-5 over a 10 day period
    /// @return result an integer from 0 to 5 inclusive
    function resourceDirection() public view returns (int256 result) {
        uint256 base = (block.timestamp % (10 days)) / (1 days);
        int256 oscillator = 5 - int256(base); // Pivot around 5 day point
        result = oscillator < 0 ? -oscillator : oscillator; // absolute value
    }

    function perlinPlacement(
        uint level,
        uint tile,
        uint seed,
        int scale
    ) public view returns (int result) {
        // Stretch/shrink the step size to the size of the token's level
        uint levelDimensions = dataV0.levelDimensions(level);
        int stepsize = (STEP * int(TOKEN_DIMS)) / int(levelDimensions);

        // The reference XY is set as the center of the current level
        // i.e. STEP*TOKEN_DIMS (a token width) * 48/2 (structure midpt)
        // + STEP*14 (the midpoint of the middle token) + 6619/2
        // + 6619/2 (halfway through the middle step)
        int refXY = STEP * (14 + int(seed + 24) * int(TOKEN_DIMS)) + 3309;

        result = IPerlinNoise(0x53B811757fC725aB3556Bc00237D9bBcF2c0DfDE)
            .noise3d(
                refXY + int(tile % levelDimensions) * stepsize * scale, // x
                refXY + int(tile / levelDimensions) * stepsize * scale, // y
                int((level + 1) * TOKEN_DIMS * 2 + (seed * TOKEN_DIMS)) *
                    STEP *
                    scale // z
            );
    }

    /// @notice Determines the animation style of a token
    /// @param placement The placement of token on level/tile before rotation
    /// @param seed Value used to rotate initial token placement
    /// @return An Animation enum representing the type of animation
    function getActivation(
        uint256 placement,
        uint256 seed
    ) public pure returns (Activation) {
        // Pseudorandom selection, "activation" is a nonce
        uint256 activation = uint256(
            keccak256(abi.encodePacked(placement, seed, "activation"))
        ) % 10000;

        // 0.1% are Plague, the rest are Cascade
        if (activation >= 9990) {
            return Activation.Plague;
        } else {
            return Activation.Cascade;
        }
    }

    /// @notice Reverses an unsigned integer of up to 64 digits
    /// @dev Digits past the 64th will be ignored
    /// @param i The int to be reversed
    /// @return result The reversed int
    function reverseUint(uint256 i) public pure returns (uint256 result) {
        for (uint256 digit; digit < 64; digit++) {
            result = result * 10 + (i % 10);
            i = i / 10;
        }
        return result;
    }

    /// @notice Determines the animation style of a token
    /// @param placement The placement of token on level/tile before rotation
    /// @param seed Value used to rotate initial token placement
    /// @return A uint representing the final rotated placement
    function rotatePlacement(
        uint256 placement,
        uint256 seed
    ) public view returns (uint256) {
        return (placement + seed) % MAX_SUPPLY;
    }

    /// @notice Converts an address to a string
    /// @param addr The address to be converted
    /// @return A string
    function addressToString(address addr) public pure returns (string memory) {
        uint256 i = uint160(addr);
        bytes memory result = new bytes(42);
        result[0] = "0";
        result[1] = "x";
        uint256 k = 42;
        for (uint256 n; n < 40; n++) {
            uint256 curr = (i & 15);
            result[--k] = curr > 9
                ? bytes1(uint8(87 + curr))
                : bytes1(uint8(48 + curr));
            i = i >> 4;
        }
        return string(result);
    }

    function addressToENS(
        address addr
    ) public view returns (string memory result) {
        ReverseRecords ens = ReverseRecords(reverseRegistrar);
        address[] memory t = new address[](1);
        t[0] = addr;
        result = ens.getNames(t)[0];
    }

    /// @notice Returns the amount of decay to apply to the token structure
    /// @dev Dreamers cannot stop decay unless there are at least 1,111 of them
    /// @param timestamp The point in time for determining decay
    /// @return result The years of decay affecting the tokens
    function structureDecay(
        uint256 timestamp
    ) public view returns (uint256 result) {
        uint256 dreamers = terraforms.dreamers();
        uint256 decayBegins = 1640354289 + dreamers * 365 days;
        if (timestamp > decayBegins && dreamers < 1111) {
            result = (timestamp - decayBegins) / 365 days;
        }
    }

    /// @notice Returns the z origin of a token in 3D space
    /// @param level The level of the superstructure
    /// @param tile The token's tile placement
    /// @param seed Value used to rotate initial token placement
    /// @param decay Amount of decay affecting the superstructure
    /// @param timestamp The time queried (structure floats and decays in time)
    /// @return An int representing the tile's z origin in 3D space
    function zOrigin(
        uint256 level,
        uint256 tile,
        uint256 seed,
        uint256 decay,
        uint256 timestamp
    ) public view returns (int256) {
        decay = structureDecay(block.timestamp); // Overwrite decay data
        int256 zDecay;

        // Check if structure is decaying
        if (decay > 0) {
            // If decay is less than 100 years, structure is collapsing
            if (decay <= 100) {
                zDecay = (STEP / 100) * int256(decay);
            } else {
                // Otherwise it has collapsed, and only the oscillation remains
                return zOscillation(level, decay, timestamp);
            }
        }

        return
            (int256(
                (// Provide a gap of 7 TOKEN_DIMS between layers
                (level + 1) * 7 + seed) * TOKEN_DIMS // Add seed for pseudorandom offset
                // Create level topography: 3/4 * TOKEN_DIMS * elevation
            ) + (24 * dataV0.tokenElevation(level, tile, seed))) *
            (STEP - zDecay) + // Reduce stepsize by amount of decay (collapse)
            zOscillation(level, decay, timestamp); // Add structure oscillation
    }

    /// @notice Calculates the seed for a token
    /// @return result The seed for the token
    function calculateSeed(
        uint level,
        uint tile
    ) public pure returns (uint result) {
        result = uint(keccak256(abi.encodePacked(level, tile))) % 10_000;
    }

    /// @notice Returns the position on the z axis of a 2D level
    /// @dev Z offset cycles over a two year period
    /// @dev Intensity of the offset increases farther from center levels
    /// @param level The level of the superstructure
    /// @param decay Amount of decay affecting the superstructure
    /// @param timestamp The time queried (structure floats and decays in time)
    /// @return result An int representing the altitude of the level
    function zOscillation(
        uint256 level,
        uint256 decay,
        uint256 timestamp
    ) public view returns (int256 result) {
        decay = structureDecay(block.timestamp); // Overwrite decay data
        int256 increment = 6; // base Z oscillation
        int256 levelIntensifier; // levels at ends move a greater distance
        int256 daysInCycle = 3650; // cycles every 10 years
        int256 locationInCycle = int256( // current day mod length of cycle
            ((timestamp - INIT_TIME) / (1 days)) % uint256(daysInCycle)
        );

        // if we're in the first half, the structure is floating up
        if (locationInCycle < daysInCycle / 2) {
            if (level > 9) {
                // top half moves faster when going up
                // intensifier will be 5% per level away from center
                levelIntensifier = int256(level - 9);
            }
        } else {
            // if we are in the last half we are floating down
            increment *= -1; // change direction to downward
            locationInCycle -= daysInCycle / 2; // subtract 1/2 for simpler math
            if (level < 9) {
                // bottom half moves faster when going down
                levelIntensifier = int256(9 - level);
            }
        }

        // Structure pivots at 1/4 and 3/4 through the cycle
        result = daysInCycle / 4 - locationInCycle;
        if (result < 0) {
            // take absolute val of distance from pivot
            result *= -1;
        }

        // Z position is distance from pivot point multiplied by increment
        result = (daysInCycle / 4 - result) * increment;

        // Add an intensifier based on distance from center
        // Multiply and then divide by 20 since we can't do floating pt math
        result += (result * levelIntensifier) / 20;

        // Dampen the result according to the level of decay
        result = result / int256(decay + 1);

        return result;
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * PUBLIC: ADMINISTRATIVE
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @notice Locks the contract
    function lock() public onlyOwner notLocked {
        isLocked = true;
    }
}
