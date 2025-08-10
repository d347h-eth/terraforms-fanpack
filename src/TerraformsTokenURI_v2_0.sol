// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ITerraformsTokenURI} from "./interfaces/ITerraformsTokenURI.sol";
import {IBeacon} from "./interfaces/IBeacon.sol";
import {ITerraformsData_v0} from "./interfaces/ITerraformsData_v0.sol";
import {ITerraforms} from "./interfaces/ITerraforms.sol";
import {ITerraformsData} from "./interfaces/ITerraformsData.sol";
import {ITerraformsHelpers} from "./interfaces/ITerraformsHelpers.sol";
import {ITerraformsSVG} from "./interfaces/ITerraformsSVG.sol";
import {AnimParams, SVGParams, AntennaStatus, Activation} from "./lib/Types.sol";
import {Base64} from "./lib/Base64.sol";
import {ToString} from "./lib/ToString.sol";
import {SD59x18, sd, convert} from "@prb/math/src/SD59x18.sol";

/// @author xaltgeist, with code direction and consultation from 113
/// @title TokenURI generation for the Terraforms contract, version 2.0
/// @dev Terraforms tokenURI data is generated on-demand; Terraforms are not stored
contract TerraformsTokenURI_v2_0 is
    ITerraformsTokenURI,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    using ToString for uint256;

    event AttunementSet(uint256 indexed tokenId, int256 attunement);

    /// @dev Parameters used to generate tokenURI
    struct tokenURIContext {
        SVGParams p; // Parameters for SVG contract
        AnimParams a; // Parameters to generate CSS animation
        string name;
        address dreamer;
        string dreamerString;
        string coordString;
        string svgMain; // Main body of the tokenURI SVG
        string animations; // SVG animation keyframes
        string script; // SVG javascript
        string imageURI; // "image" attribute source
        string animationURI; // "animation_url" source
        string activation; // Token activation
        string mode; // Terrain, Daydream, Terraform
        string antennaString;
    }

    // Interfaces
    IBeacon beacon;
    ITerraformsData_v0 dataV0;
    ITerraforms terraforms;
    ITerraformsData terraformsData;
    ITerraformsHelpers helpers;
    ITerraformsSVG terraformsSVG;

    string public version;
    string public animationURL;
    string public imageURL;
    uint256[3] public durations;
    uint256[3] public animatedClasses;
    uint public kairoDrive;
    uint public chronoDrive;
    string[2][7] public altColors;
    mapping(uint => int) public tokenPlacementToAttunement;
    bool public isLocked;

    modifier notLocked() {
        require(isLocked == false, "Contract is locked");
        _;
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * INITIALIZER
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _terraformsSVGAddress,
        address _helpersAddress,
        address _beaconAddress
    ) public initializer {
        __Ownable_init();
        version = "Version 2.0";
        // Initialize interfaces
        beacon = IBeacon(_beaconAddress);
        dataV0 = ITerraformsData_v0(0xA5aFC9fE76a28fB12C60954Ed6e2e5f8ceF64Ff2);
        terraforms = ITerraforms(0x4E1f41613c9084FdB9E34E11fAE9412427480e56); // Main (ERC721) contract
        helpers = ITerraformsHelpers(_helpersAddress);
        terraformsSVG = ITerraformsSVG(_terraformsSVGAddress); // Assembles SVG

        kairoDrive = 3300;
        chronoDrive = 12;
        animationURL = "https://tokens.mathcastles.xyz/terraforms/token-html/";
        durations = [300, 800, 8000];
        animatedClasses = [7651, 65432, 7654321];
        altColors = [
            ["#ffffff", "#202020"],
            ["#b169ff", "#ff2436"],
            ["#eb048d", "#05a98d"],
            ["#0000ff", "#ffffff"],
            ["#ff0000", "#ffffff"],
            ["#eb8034", "#0000ff"],
            ["#ffb8ff ", "#202020"]
        ];
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner notLocked {}

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * PUBLIC: WRITE FUNCTIONS
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @notice Allows token owners to set their token's attunement
    /// @param tokenId The tokenId
    /// @param attunement The attunement. 0 (default) = homeostasis, positive = activated, negative = retrograde/deactivated)
    function setAttunement(uint256 tokenId, int attunement) public {
        require(
            terraforms.ownerOf(tokenId) == msg.sender,
            "Only token owner can set attunement"
        );
        tokenPlacementToAttunement[
            terraforms.tokenToPlacement(tokenId)
        ] = attunement;
        emit AttunementSet(tokenId, attunement);
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * PUBLIC: TOKEN DATA
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @notice Returns a Terraform parcel's tokenURI
    /// @param tokenId The tokenId, from 1 to tokenCounter (max MAX_SUPPLY)
    /// @return result A base64 encoded JSON string
    function tokenURI(
        uint256 tokenId,
        uint256 status,
        uint256 placement,
        uint256 seed,
        uint256 decay,
        uint256[] memory canvas
    ) public view returns (string memory result) {
        tokenURIContext memory ctx; // Track local variables
        ctx.p = svgParameters(status, placement, seed, decay, canvas); // Generate parameters for creating SVG

        ctx.a = animationParameters(placement, seed); // Generate anim params

        // If there is no external URL for animation or image,
        // or if we are 50 years after the original Terraforms deploy,
        // we are serving the parcel visuals directly from the contract
        if (
            bytes(animationURL).length == 0 ||
            bytes(imageURL).length == 0 ||
            block.timestamp > 1639749489 + 1577847600
        ) {
            (ctx.svgMain, ctx.animations, ctx.script) = terraformsSVG.makeSVG(
                ctx.p,
                ctx.a
            );
        }

        // If there is no external animation URL,
        // or if we are 50 years after the original Terraforms deploy,
        // serve the parcel animation directly from the contract
        if (
            bytes(animationURL).length == 0 ||
            block.timestamp > 1639749489 + 157784760
        ) {
            ctx.animationURI = string(
                abi.encodePacked(
                    ', "animation_url":"data:text/html;charset=utf-8,<html><head><meta charset=\'UTF-8\'><style>html,body,svg{margin:0;padding:0; height:100%;text-align:center;}</style></head><body>',
                    ctx.svgMain,
                    ctx.animations,
                    "</style>",
                    ctx.script,
                    '</svg></body></html>"'
                )
            );
        } else {
            // Otherwise, include the external URL with the tokenId
            ctx.animationURI = string(
                abi.encodePacked(
                    ', "animation_url":"',
                    animationURL,
                    tokenId.toString(),
                    '"'
                )
            );
        }

        // If there is no external image URL,
        // or if we are 50 years after the original Terraforms deploy,
        // serve the parcel image directly from the contract
        if (
            bytes(imageURL).length == 0 ||
            block.timestamp > 1639749489 + 1577847600
        ) {
            // If the antenna is on and it's daydreaming, return a radiating antenna image
            if (ctx.p.antenna == AntennaStatus.On && ctx.p.status % 2 == 1) {
                ctx.imageURI = string(
                    abi.encodePacked(
                        '}], "image": "data:image/svg+xml;base64,',
                        Base64.encode(
                            abi.encodePacked(staticAntennaImage(ctx.p, ctx.a))
                        ),
                        '"'
                    )
                );
            } else {
                ctx.imageURI = string(
                    abi.encodePacked(
                        '}], "image": "data:image/svg+xml;base64,',
                        Base64.encode(
                            abi.encodePacked(ctx.svgMain, "</style></svg>")
                        ),
                        '"'
                    )
                );
            }
        } else {
            // Otherwise, include the external URL with the tokenId
            ctx.imageURI = string(
                abi.encodePacked(
                    '}], "image":"',
                    imageURL,
                    tokenId.toString(),
                    '"'
                )
            );
        }

        // If token is terraformed, include the artist in tokenURI
        if (status == 2 || status == 4) {
            ctx.dreamer = terraforms.tokenToDreamer(tokenId);
            if (ctx.dreamer != address(0)) {
                string memory ens = helpers.addressToENS(ctx.dreamer);
                string memory artist;
                if (bytes(ens).length > 0 && bytes(ens).length <= 2000) {
                    artist = ens;
                } else {
                    artist = helpers.addressToString(ctx.dreamer);
                }
                ctx.dreamerString = string(
                    abi.encodePacked(
                        '"},{"trait_type":"Artist","value":"',
                        artist
                    )
                );
            }
        }

        // Determine the token's activation
        if (ctx.a.activation == Activation.Plague) {
            ctx.activation = "Plague";
        } else if (ctx.a.duration == durations[0]) {
            ctx.activation = "Hyper";
        } else if (ctx.a.duration == durations[1]) {
            ctx.activation = "Pulse";
        } else {
            ctx.activation = "Flow";
        }

        // Determine the token's status
        if (ctx.p.status == 0) {
            ctx.mode = "Terrain";
        } else {
            if (ctx.p.status == 1) {
                ctx.mode = "Daydream";
            } else if (ctx.p.status == 2) {
                ctx.mode = "Terraform";
            } else if (ctx.p.status == 3) {
                ctx.mode = "Origin Daydream";
            } else {
                ctx.mode = "Origin Terraform";
            }
        }

        if (ctx.p.antenna == AntennaStatus.Off) {
            ctx.antennaString = '"},{"trait_type":"Antenna","value":"Off';
        } else if (ctx.p.antenna == AntennaStatus.On) {
            ctx.antennaString = '"},{"trait_type":"Antenna","value":"On';
        } else {
            ctx.antennaString = '"},{"trait_type":"Antenna","value":"Uplink';
        }

        // Include the token's coordinates
        uint levelDimensions = dataV0.levelDimensions(ctx.p.level);
        ctx.coordString = string(
            abi.encodePacked(
                '},{"trait_type":"X Coordinate","value":"',
                (ctx.p.tile % levelDimensions).toString(),
                '"},{"trait_type":"Y Coordinate","value":"',
                (ctx.p.tile / levelDimensions).toString()
            )
        );

        // Assemble the token's name
        ctx.name = string(
            abi.encodePacked(
                "Level ",
                (ctx.p.level + 1).toString(),
                " at {",
                (ctx.p.tile % levelDimensions).toString(),
                ", ",
                (ctx.p.tile / levelDimensions).toString(),
                "}"
            )
        );

        // Generate tokenURI string
        result = string(
            abi.encodePacked(
                '{"name":"',
                ctx.name,
                '","description": "Terraforms by Mathcastles. Onchain land art from a dynamically generated, onchain 3D world."',
                ctx.animationURI,
                ', "aspect_ratio":0.6929, "version":"',
                version,
                '", "attributes": [{"trait_type":"Version", "value":"2.0"},{"trait_type":"Level","value":',
                (ctx.p.level + 1).toString(),
                ctx.coordString,
                '"},{"trait_type":"Mode","value":"',
                ctx.mode,
                ctx.dreamerString,
                '"},{"trait_type":"Zone","value":"',
                ctx.p.zoneName,
                '"},{"trait_type":"Biome","value":"',
                ctx.p.biome.toString(),
                '"},{"trait_type":"Chroma","value":"',
                ctx.activation
            )
        );
        result = string(
            abi.encodePacked(
                result,
                ctx.antennaString,
                '"},{"trait_type":"',
                dataV0.resourceName(),
                '","value":',
                ctx.p.resourceLvl.toString(),
                ctx.imageURI,
                "}"
            )
        );
        result = string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(result))
            )
        );
    }

    /// @notice Returns HTML containing the token SVG
    /// @param status The token's status
    /// @param placement Placement of token on level/tile before rotation
    /// @param seed Seed used to rotate initial token placement
    /// @param decay Amount of decay affecting the superstructure
    /// @return A plaintext HTML string with a plaintext token SVG
    function tokenHTML(
        uint256 status,
        uint256 placement,
        uint256 seed,
        uint256 decay,
        uint256[] memory canvas
    ) public view returns (string memory) {
        SVGParams memory p = svgParameters(
            status,
            placement,
            seed,
            decay,
            canvas
        );

        AnimParams memory a = animationParameters(placement, seed);

        (
            string memory svgMain,
            string memory animations,
            string memory script
        ) = terraformsSVG.makeSVG(p, a);

        // Wrap the SVG in HTML tags
        return
            string(
                abi.encodePacked(
                    "<html><head><meta charset='UTF-8'><style>html,body,svg{margin:0;padding:0; height:100%;text-align:center;}</style></head><body>",
                    svgMain,
                    animations,
                    "</style>",
                    script,
                    "</svg></body></html>"
                )
            );
    }

    /// @notice Returns an animated SVG of a parcel
    /// @param status The token's status
    /// @param placement Placement of token on level/tile before rotation
    /// @param seed Seed used to rotate initial token placement
    /// @param decay Amount of decay affecting the superstructure
    /// @param canvas The canvas data of a (dreaming) token
    /// @return A plaintext SVG string
    function tokenSVG(
        uint256 status,
        uint256 placement,
        uint256 seed,
        uint256 decay,
        uint256[] memory canvas
    ) public view returns (string memory) {
        // Generate parameters for SVG
        SVGParams memory p = svgParameters(
            status,
            placement,
            seed,
            decay,
            canvas
        );

        // Generate parameters for animation
        AnimParams memory a = animationParameters(placement, seed);
        if (p.antenna == AntennaStatus.On && p.status % 2 == 1) {
            return staticAntennaImage(p, a);
        }

        // SVG is in sections, so we can assemble static and animated images
        (string memory svgMain, , ) = terraformsSVG.makeSVG(p, a);

        return string(abi.encodePacked(svgMain, "</style>", "</svg>"));
    }

    /// @notice Generates a special static SVG for daydreaming parcels with antennas on
    /// @param p SVGParams for the token
    /// @param a AnimParams for the token
    /// @return result A plaintext SVG string
    function staticAntennaImage(
        SVGParams memory p,
        AnimParams memory a
    ) public view returns (string memory result) {
        uint seed = helpers.calculateSeed(p.level, p.tile);
        // For biome 0, insert a space character in the first two character slots so the antenna is visible
        if (p.biome == 0) {
            p.chars[0] = " ";
            p.chars[1] = " ";
            p.chars[2] = " ";
            p.chars[3] = " ";
        }
        p.heightmapIndices = antennaHeightmap(seed);
        p.zoneColors = [
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[0],
            p.zoneColors[9]
        ];

        (result, , ) = terraformsSVG.makeSVG(p, a);
        return string(abi.encodePacked(result, "</style>", "</svg>"));
    }

    /// @notice Returns the attunement of a token
    /// @param tokenId The tokenId
    /// @return result The attunement
    function tokenToAttunement(uint256 tokenId) public view returns (int) {
        return tokenPlacementToAttunement[terraforms.tokenToPlacement(tokenId)];
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * HELPERS FOR SVG ASSEMBLY
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @notice Returns the token's parameters to create the tokenURI and SVG
    /// @param status The token's status
    /// @param placement The placement of token on level/tile before rotation
    /// @param seed Value used to rotate initial token placement
    /// @param decay Amount of decay affecting the superstructure
    /// @param canvas The canvas data of a (dreaming) token
    /// @return p A SVGParams struct
    function svgParameters(
        uint256 status,
        uint256 placement,
        uint256 seed,
        uint256 decay,
        uint256[] memory canvas
    ) public view returns (SVGParams memory p) {
        p.status = status;
        (p.level, p.tile) = dataV0.levelAndTile(placement, seed);
        p.resourceLvl = dataV0.resourceLevel(placement, seed);
        p.resourceDirection = uint256(helpers.resourceDirection());
        (p.zoneColors, p.zoneName) = dataV0.tokenZone(placement, seed);
        // Flip the first two colors of Uwo and Treasure if not in terrain mode
        if (
            status > 0 &&
            (keccak256(bytes(p.zoneName)) == keccak256(bytes("Uwo")) ||
                keccak256(bytes(p.zoneName)) == keccak256(bytes("Treasure")))
        ) {
            (p.zoneColors[0], p.zoneColors[1]) = (
                p.zoneColors[1],
                p.zoneColors[0]
            );
        }
        (p.chars, p.font, p.fontSize, p.biome) = dataV0.characterSet(
            placement,
            seed
        );
        p.heightmapIndices = terraformsData.tokenHeightmapIndices(
            status,
            placement,
            seed,
            decay,
            canvas
        );
        (p.antenna, p.script) = beacon.getParcelCodeFromPlacement(placement);
    }

    /// @notice Determines CSS styles based on a token's animation type
    /// @param placement The placement of token on level/tile before rotation
    /// @param seed Value used to rotate initial token placement
    /// @return a An AnimParams struct
    function animationParameters(
        uint256 placement,
        uint256 seed
    ) public view returns (AnimParams memory a) {
        // Use pseudorandom value for determining animation
        uint256 sorter = uint256(keccak256(abi.encodePacked(placement, seed)));
        a.activation = helpers.getActivation(placement, seed);

        // Baseline animation keyframes ('ms' is for string concatenation later)
        a.easing = "ms steps(1)";

        if (a.activation == Activation.Plague) {
            a.classesAnimated = 876543210; // All classes are animated
            a.duration = 100 + (sorter % 400); // Speed from 100 to 500 ms
            a.durationInc = a.duration; // Duration increases for each class
            if (sorter % 2 == 0) {
                // Half of the animations are delayed by 2-4s
                a.delay = 2000 + (sorter % 2000);
                a.delayInc = a.delay;
                a.bgDelay = a.delay * 11;
            }
            a.bgDuration = 50; // Backgrounds are animated at high speed
            a.altColors = altColors[(sorter / 10) % 7]; // Alternate colors
        } else {
            // If token activation is not plague, determine animation amt
            if ((sorter / 1000) % 100 < 50) {
                a.classesAnimated = animatedClasses[2];
            } else if ((sorter / 1000) % 100 < 80) {
                a.classesAnimated = animatedClasses[1];
            } else {
                a.classesAnimated = animatedClasses[0];
            }

            // Determine animation speed
            if (sorter % 100 < 60) {
                a.duration = durations[2];
            } else if (sorter % 100 < 90) {
                a.duration = durations[1];
            } else {
                a.duration = durations[0];
            }

            // Determine animation rhythm
            if ((sorter / 10000) % 100 < 10) {
                a.delayInc = a.duration / 10;
            } else {
                if (a.classesAnimated > 100000) {
                    a.delayInc = a.duration / 7;
                } else if (a.classesAnimated > 10000) {
                    a.delayInc = a.duration / 5;
                } else {
                    a.delayInc = a.duration / 4;
                }
            }

            // Use linear keyframes for all slow animations and for half of
            // medium animations
            if (
                a.duration == durations[2] ||
                (a.duration == durations[1] && (sorter / 100) % 100 >= 50)
            ) {
                a.easing = "ms linear alternate both";
            }

            // Add a duration increment to 25% of tokens that are cascade
            // and not fast animations
            if (
                a.activation == Activation.Cascade &&
                sorter % 4 == 0 &&
                a.duration != durations[0]
            ) {
                a.durationInc = a.duration / 5;
            }
        }
    }

    /// @notice Generates a special heightmap used for generating static antenna SVGs
    /// @return result The heightmap
    function antennaHeightmap(
        uint seed
    ) public view returns (uint256[32][32] memory result) {
        for (uint256 col; col < 32; col++) {
            for (uint256 row; row < 32; row++) {
                result[row][col] = radialDistance(
                    hypotenuse(int256(row), int256(col), int256(row)),
                    seed
                );
            }
        }
    }

    /// @notice Calculates the distance between two points in a 2D plane
    /// @dev The value of y1 is fixed at 16.0
    /// @param x1 The first x coordinate
    /// @param x2 The second x coordinate
    /// @param y2 The second y coordinate
    function hypotenuse(
        int256 x1,
        int256 x2,
        int256 y2
    ) public pure returns (SD59x18) {
        return
            convert(x2)
                .sub(convert(x1))
                .powu(2)
                .add(convert(y2).sub(sd(16e18)).powu(2))
                .sqrt();
    }

    /// @notice Converts a hypotenuse return value to a biome index value
    /// @param dist The distance to be converted
    /// @return result The biome index value
    function radialDistance(
        SD59x18 dist,
        uint seed
    ) public view returns (uint256 result) {
        // Do some rounding
        if (dist.frac().lt(sd(0.5e18))) {
            result = uint256(convert(dist));
        } else {
            result = uint256(convert(dist)) + 1;
        }

        if (seed == 0) {
            return result % 9;
        }
        result =
            (result +
                ((seed / kairoDrive) + 1) *
                (block.timestamp / chronoDrive)) %
            9;
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * PUBLIC: ADMINISTRATIVE
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /// @notice Sets external URL for token animations
    /// @dev If set to the empty string, onchain animation will be used
    /// @param url is the base URL for token animations
    function setAnimationURL(string memory url) public onlyOwner notLocked {
        animationURL = url;
    }

    /// @notice Sets external URL for token animations
    /// @dev If set to the empty string, onchain image will be used
    /// @param url is the base URL for token images
    function setImageURL(string memory url) public onlyOwner notLocked {
        imageURL = url;
    }

    function setDrive(
        uint _kairoDrive,
        uint _chronoDrive
    ) public onlyOwner notLocked {
        kairoDrive = _kairoDrive;
        chronoDrive = _chronoDrive;
    }

    /// @notice Sets the address of the Terraforms Data contract
    /// @param _address The address
    function setTerraformsDataAddress(
        address _address
    ) public onlyOwner notLocked {
        terraformsData = ITerraformsData(_address);
    }

    /// @notice Locks the contract
    function lock() public onlyOwner notLocked {
        isLocked = true;
    }
}
