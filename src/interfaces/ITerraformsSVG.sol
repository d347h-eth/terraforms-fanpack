// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AnimParams, SVGParams} from "../lib/Types.sol";

interface ITerraformsSVG {
    function makeSVG(
        SVGParams memory,
        AnimParams memory
    ) external view returns (string memory, string memory, string memory);
}
