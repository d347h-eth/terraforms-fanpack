// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TerraformsCharacters is Ownable {
     
     string[9][92] charsets = [
        [unicode'▆', unicode'▇', unicode'▆', unicode'▇', unicode'▉', unicode'▊', unicode'▋', unicode'█', unicode'▊'],
        [unicode'▚', unicode'▛', unicode'▜', unicode'▙', unicode'▗', unicode'▘', unicode'▝', unicode'▟', unicode'▞'],
        [unicode'▇', unicode'▚', unicode'▚', unicode'▚', unicode'▞', unicode'▞', unicode'▞', unicode'▞', unicode'▇'],
        [unicode'▅', unicode'▂', unicode'▅', unicode'▃', unicode'▂', unicode'▃', unicode'▃', unicode'▂', unicode'▅'],
        [unicode'▅', unicode'▂', unicode'▃', unicode'▃', unicode'▂', unicode'▃', unicode'▃', unicode'▂', unicode'▆'],
        [unicode'█', unicode'▂', unicode'▂', unicode'▂', unicode'▂', unicode'▂', unicode'▂', unicode'▂', unicode'█'],
        [unicode'▂', unicode'█', unicode'▂', unicode'▂', unicode'▂', unicode'▂', unicode'█', unicode'█', unicode'▂'],
        [unicode'█', unicode'▄', unicode'░', unicode'░', unicode'▒', unicode'▓', unicode'▀', unicode'░', unicode'▄'],
        [unicode'▝', unicode'▒', unicode'▛', unicode'▒', unicode'▝', unicode'▅', unicode'░', unicode'░', unicode'▒'],
        [unicode'█', unicode'▓', unicode'░', unicode'░', unicode'▒', unicode'▒', unicode'▒', unicode'▒', unicode'▓'],
        [unicode'▌', unicode'▄', unicode'█', unicode'░', unicode'▒', unicode'▓', unicode'▓', unicode'▀', unicode'▐'],
        [unicode'█', unicode'▌', unicode'▐', unicode'▄', unicode'▀', unicode'░', unicode'▒', unicode'▓', unicode'▓'],
        [unicode'▉', unicode'―', unicode'―', unicode'▉', unicode'―', unicode'―', unicode'―', unicode'―', unicode'▆'],
        [unicode'░', unicode'░', unicode'█', unicode'▄', unicode'▒', unicode'▓', unicode'▀', unicode'░', unicode'▄'],
        [unicode'░', unicode'░', unicode'▒', unicode'▓', unicode'▓', unicode'▒', unicode'▒', unicode'▒', unicode'░'],
        [unicode'⛆', unicode'░', unicode'░', unicode'⛆', unicode'⛆', unicode'⛆', unicode'░', unicode'▒', unicode'▒'],
        [unicode'⛆', unicode'▒', unicode'░', unicode'▓', unicode'▓', unicode'▓', unicode'░', unicode'▒', unicode'⛆'],
        [unicode'⛆', unicode'░', '+', '+', '+', '+', unicode'▒', unicode'▒', unicode'▒'],
        [unicode'█', unicode'╔', unicode'╔', unicode'╣', unicode'═', unicode'╣', unicode'═', unicode'╣', unicode'█'],
        [unicode'╚', unicode'░', unicode'░', unicode'╝', unicode'═', unicode'╣', unicode'═', unicode'═', unicode'╝'],
        [unicode'╝', unicode'═', unicode'╣', unicode'░', unicode'░', unicode'╔', unicode'═', unicode'═', unicode'▒'],
        [unicode'═', unicode'╚', unicode'╔', unicode'⾂', unicode'⾂', unicode'⾂', unicode'═', unicode'╝', unicode'═'],
        [unicode'▒', unicode'?', unicode'▒', unicode'☎', unicode'☎', unicode'▒', unicode'?', unicode'☆', unicode'░'],
        [unicode'?', unicode'?', unicode'░', unicode'⾂', unicode'▒', unicode'░', unicode'?', unicode'?', unicode'?'],
        [unicode'?', unicode'╣', unicode'╔', unicode'╣', unicode'╚', unicode'═', unicode'╔', unicode'?', unicode'?'],
        [unicode'?', unicode'░', unicode'➫', unicode'⋆', '.', unicode'➫', unicode'░', unicode'░', unicode'?'],
        [unicode'?', unicode'?', unicode'░', unicode'♖', unicode'░', unicode'░', unicode'?', unicode'░', unicode'♘'],
        [unicode'?', unicode'?', unicode'░', unicode'?', unicode'░', unicode'?', unicode'?', unicode'░', unicode'♖'],
        [unicode'?', unicode'░', unicode'?', unicode'⋆', unicode'?', unicode'?', unicode'░', unicode'░', unicode'?'],
        [unicode'?', unicode'░', unicode'?', unicode'⋆', unicode'?', unicode'⛱', unicode'░', unicode'░', unicode'⛱'],
        [unicode'⛓', unicode'░', unicode'❀', unicode'?', unicode'❀', unicode'⛓', unicode'❀', unicode'░', unicode'⛓'],
        [unicode'⛓', unicode'░', unicode'?', unicode'?', unicode'?', unicode'⛓', unicode'➫', unicode'░', unicode'⛓'],
        [unicode'?', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'?'],
        [unicode'?', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'⛓', unicode'?'],
        [unicode'?', unicode'█', unicode'█', unicode'╣', unicode'═', unicode'╣', unicode'▄', unicode'█', unicode'?'],
        [unicode'?', unicode'█', unicode'█', unicode'█', unicode'█', unicode'█', unicode'█', unicode'█', unicode'?'],
        [unicode'?', unicode'▂', unicode'▅', unicode'▅', unicode'▅', unicode'▂', unicode'▂', unicode'?', unicode'?'],
        [unicode'?', unicode'⛓', unicode'?', unicode'█', unicode'█', unicode'█', unicode'?', unicode'⛓', unicode'?'],
        [unicode'♘', unicode'♜', unicode'▂', unicode'▂', unicode'▂', unicode'♜', unicode'♜', unicode'♜', unicode'♖'],
        [unicode'♜', unicode'♘', ' ', ' ', ' ', unicode'♖', unicode'♖', unicode'♖', unicode'♜'],
        [unicode'❀', unicode'⋮', unicode'⋮', unicode'⋮', unicode'❀', unicode'❀', unicode'⋮', unicode'⋮', unicode'❀'],
        [unicode'⛓', unicode'░', unicode'?', unicode'?', unicode'?', unicode'?', unicode'▒', unicode'░', unicode'⛓'],
        [unicode'⛆', unicode'༽', unicode'༼', unicode'༼', unicode'༼', unicode'༼', unicode'༼', unicode'༽', unicode'⛆'],
        [unicode'░', unicode'░', unicode'⋆', unicode'░', '.', unicode'░', unicode'░', unicode'░', unicode'?'],
        [unicode'?', unicode'⛆', unicode'░', unicode'░', unicode'⛱', unicode'⋰', unicode'⋰', unicode'⋰', unicode'⋰'],
        [unicode'⋮', unicode'⋮', unicode'⋮', unicode'⋮', unicode'⋮', unicode'░', unicode'░', unicode'░', unicode'░'],
        [unicode'❀', '.', '.', unicode'⫯', unicode'⫯', '.', '.', unicode'⫯', unicode'❀'],
        [unicode'⛫', unicode'⛫', unicode'⛫', unicode'⋰', unicode'⋰', unicode'⋰', unicode'⛫', unicode'⛫', unicode'⛫'],
        [unicode'⚑', unicode'⋰', unicode'⋰', unicode'⋰', unicode'⋰', unicode'⋰', unicode'⋰', unicode'⋰', unicode'?'],
        [unicode'?', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'?'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'⩎', unicode'⛆', unicode'⍝', unicode'⛆', unicode'⍝'],
        [unicode'⍝', '.', unicode'░', unicode'░', unicode'░', '.', '.', unicode'✗', unicode'⍝'],
        [unicode'⋰', unicode'⋰', unicode'⋮', unicode'⋮', unicode'⋮', unicode'⋯', unicode'⋯', unicode'⋱', unicode'⋱'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'⛓', unicode'⛓', unicode'⛓'],
        [unicode'?', unicode'?', '0', '0', '1', '1', '0', '0', unicode'?'],
        [unicode'?', '.', '.', unicode'⇩', unicode'⇩', '.', '.', unicode'?', unicode'?'],
        [unicode'⟰', unicode'⋮', unicode'⋮', unicode'⫯', unicode'⋮', unicode'⋮', unicode'⟰', unicode'⟰', unicode'⟰'],
        ['.', '.', '#', '#', '#', '#', '#', '#', unicode'⛫'],
        ['0', '0', '0', '.', '.', '1', '1', '1', '1'],
        [unicode'⌬', unicode'╚', unicode'╔', unicode'╣', unicode'╣', unicode'═', unicode'═', unicode'═', unicode'⌬'],
        [unicode'⎛', unicode'⎛', unicode'░', unicode'░', unicode'░', unicode'░', unicode'░', unicode'⎞', unicode'⎞'],
        [unicode'❀', unicode'⋮', unicode'⋮', unicode'༽', unicode'༽', unicode'⋮', unicode'⋮', unicode'⋮', unicode'❀'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?'],
        [unicode'⌬', unicode'༼', unicode'༼', unicode'༼', unicode'༼', unicode'༼', unicode'༼', unicode'༼', unicode'⌬'],
        [unicode'⋮', unicode'⋮', unicode'⋮', unicode'⌬', unicode'⌬', unicode'⋮', unicode'⋮', unicode'⋮', unicode'?'],
        [unicode'༼', unicode'༼', unicode'༼', unicode'༽', unicode'༽', unicode'༽', unicode'༽', unicode'༽', unicode'༽'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?'],
        [unicode'✎', unicode'༽', unicode'༽', unicode'༽', unicode'༽', unicode'༽', unicode'༽', unicode'༽', unicode'✎'],
        [unicode'♥', unicode'♡', '.', '.', unicode'?', unicode'?', '.', '.', unicode'♡'],
        [unicode'?', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'?', unicode'?'],
        [unicode'?', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'═', unicode'?', unicode'?'],
        [unicode'?', unicode'♥', unicode'♥', 'g', 'm', unicode'♥', unicode'♥', unicode'♥', unicode'?'],
        [unicode'?', unicode'♥', unicode'♥', unicode'城', unicode'城', unicode'♥', unicode'♥', unicode'♥', unicode'?'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?'],
        [unicode'░', unicode'░', unicode'░', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'░'],
        [unicode'지', unicode'지', unicode'지', '-', '-', '-', unicode'역', unicode'역', unicode'역'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'城', unicode'城', unicode'?', unicode'?', unicode'?'],
        [unicode'▧', unicode'═', unicode'═', unicode'▧', unicode'═', unicode'═', unicode'═', unicode'▧', unicode'▧'],
        [unicode'▧', unicode'▧', unicode'⬚', unicode'▧', unicode'⬚', unicode'⬚', unicode'⬚', unicode'▧', unicode'▧'],
        [unicode'▩', unicode'▩', unicode'▧', unicode'?', unicode'?', unicode'?', unicode'?', unicode'▧', unicode'▩'],
        [unicode'◩', unicode'◩', unicode'◪', '.', '.', unicode'◩', unicode'◩', unicode'◪', unicode'◪'],
        [unicode'◩', unicode'◪', unicode'◪', unicode'⛆', unicode'⛆', unicode'◩', unicode'◩', unicode'◩', unicode'⛆'],
        [unicode'╳', unicode'╱', unicode'╱', unicode'╱', unicode'╳', unicode'╲', unicode'╲', unicode'╲', unicode'╳'],
        [unicode'?', unicode'⚑', unicode'⚑', unicode'⚑', unicode'⚑', unicode'⚑', unicode'⚑', unicode'⚑', unicode'★'],
        ['_', '_', '_', '|', '|', '|', '_', '|', '|'],
        [unicode'♜', unicode'♖', unicode'░', unicode'░', unicode'░', unicode'░', unicode'♘', unicode'♘', unicode'♛'],
        [unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?', unicode'?'],
        [unicode'▂', unicode'✗', unicode'✗', unicode'⛆', unicode'⛆', unicode'✗', unicode'✗', unicode'⛆', unicode'▂'],
        ['{', '}', '-', '-', '-', '%', '%', '%', '%'],
        ['0', '.', '.', '.', '-', '^', '.', '.', '/'],
        ['_', '~', '~', '~', '~', '.', '*', unicode'⫯', unicode'❀'],
        [unicode'?', unicode'╚', unicode'╔', unicode'╣', unicode'╣', unicode'═', unicode'═', unicode'═', unicode'⛓']
    ];

    uint[92] fontIds = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        2,
        2,
        1,
        5,
        3,
        3,
        5,
        7,
        4,
        5,
        5,
        5,
        1,
        1,
        2,
        2,
        6,
        6,
        9,
        5,
        9,
        7,
        7,
        7,
        13,
        7,
        7,
        1,
        8,
        7,
        7,
        6,
        6,
        9,
        8,
        8,
        6,
        1,
        6,
        9,
        9,
        9,
        9,
        9,
        10,
        9,
        10,
        10,
        10,
        10,
        10,
        11,
        1,
        11,
        11,
        11,
        11,
        11,
        11,
        11,
        12,
        12,
        13,
        6,
        12,
        12,
        13,
        13,
        13,
        1
    ];

    mapping (uint => string) fonts;

    constructor () Ownable() {
    }

    /// @notice Adds a font (only owner)
    /// @param id The id of the font
    /// @param base64 A base64-encoed font
    function addFont(uint id, string memory base64) public onlyOwner {
        fonts[id] = base64;
    }

    /// @notice Retrieves a font
    /// @param id The font's id
    /// @return A base64 encoded font
    function font(uint id) public view returns (string memory) {
        return fonts[id];
    }

    /// @notice Retrieves a character set
    /// @param index The index of the character set in the above array
    /// @return An array of 9 strings
    /// @return The id of the font associated with the characters
    function characterSet(uint index) 
        public 
        view 
        returns (string[9] memory, uint) 
    {
        return (charsets[index], fontIds[index]);
    }
}