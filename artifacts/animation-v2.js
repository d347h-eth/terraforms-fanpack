let MODE = 0;
let LEVEL = 15;
let BIOMECODE = ["🕈", "🞗", "🞗", "🞗", "⩎", "⛆", "⍝", "⛆", "⍝"];
let BIOME = 50;
let ZONE = "Treasure";
let CHROMA = "Flow";
let ANTENNA = 0;
let ATTUNEMENT = 0;
let RESOURCE = 29858;
let DIRECTION = 3;
const SEED = 7842;
let ATIME = 0;
let TIME = 1753830875;
let extraFont = `@font-face {font-family:'MathcastlesRemix-Extra';font-display:block;src:url() format('woff');}`;
document.head.insertAdjacentHTML("beforeend", "<style>" + extraFont + "</style>");
function map(v, l1, h1, l2, h2) {
    return l2 + ((h2 - l2) * (v - l1)) / (h1 - l1);
}
function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}
let sfc32 = function (a, b, c, d) {
    let t = 0;
    return function () {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
};
let rngA = sfc32(SEED, BIOMECODE[0].codePointAt(0), ZONE.codePointAt(0) + ZONE.codePointAt(1), ATTUNEMENT);
for (let i = 0; i < 12; i++) {
    rngA();
}
function cssMod(sel, props, shts) {
    if (!shts) shts = [...document.styleSheets];
    else if (shts.sup) {
        let absoluteURL = new URL(shts, document.baseURI).href;
        shts = [...document.styleSheets].filter((i) => i.href == absoluteURL);
    } else shts = [shts];
    sel = sel.replace(/\s+/g, " ");
    const findRule = (s) => [...s.cssRules].reverse().find((i) => i.selectorText == sel);
    let rule = shts
        .map(findRule)
        .filter((i) => i)
        .pop();
    const propsArr = props.sup ? props.split(/\s*;\s*/).map((i) => i.split(/\s*:\s*/)) : Object.entries(props);
    if (rule)
        for (let [p, v] of propsArr) {
            rule.style.setProperty(p, ...v.split(/ *!(?=important)/));
        }
    else {
        s = shts.pop();
        if (!props.sup) props = propsArr.reduce((str, [k, v]) => `${str}; ${k}: ${v}`, "");
        s.insertRule(`${seleselctor} { ${props} }`, s.cssRules.length);
    }
}
cssMod("p", "font-family: MathcastlesRemix-Regular, MathcastlesRemix-Extra, monospace");
RESOURCE = RESOURCE / 1e4;
let isTerrain = MODE == 0;
let isDaydream = MODE == 1 || MODE == 3;
let isTerraformed = MODE == 2 || MODE == 4;
let isOrigin = MODE == 3 || MODE == 4;
let isPlague = CHROMA == "Plague";
let overdrive = false;
let classIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
let charSet = [];
let bCore = BIOMECODE;
let uni = [9600, 9610, 9620, 3900, 9812, 9120, 9590, 143345, 48, 143672, 143682, 143692, 143702, 820, 8210, 8680, 9573, 142080, 142085, 142990, 143010, 143030, 9580, 9540, 1470, 143762, 143790, 143810];
function makeSet(startRange) {
    let newSet = [];
    for (let i = startRange; i < startRange + 10; i++) {
        newSet.push(String.fromCharCode(i));
    }
    return newSet;
}
if (BIOME == 0 && MODE > 0 && ANTENNA == 1) {
    for (let i = 0; i < 5; i++) {
        bCore.push(" ");
    }
}
if (ANTENNA == 0 && MODE > 0) {
    let uniq = [...new Set(bCore)];
    let shuffl = [bCore[0]];
    for (let i = 1; i < bCore.length; i++) {
        let b = bCore[i];
        if (shuffl[shuffl.length - 1].valueOf() != b.valueOf()) {
            shuffl.push(b);
        }
    }
    bCore = uniq;
}
let coreCharsetLength = bCore.length;
let originalChars = bCore;
charSet.push(originalChars);
let seedSet = [];
let bladeRailSequencer = [
    "███████░░████████░░███████    █",
    "▟▙▆▇▂▟▙▆▇▂▟▙▆▇▂▟▙▆▇▂▟▙▆▇▂           ▅█▃▊▄▜▛▁",
    "▟ █ █ █ █ █ ▙ ▆▇░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▓▓▓▙――――――▄▄▄▀▀▀▄▄▄▀▀▀▄▄▄▀▀▀▄▄▄▀▀▀▄▄▄▀▀▀▄▄▄▀▀▀▜▁▛▜▁▛ ",
    "   ░░░░░░▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓███████▓▓▓▓▓▓▓▓▓▒▒▒▒▒░░░░░",
    "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▓░░▂▃▅▅▃▂░░▓▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▓░░░░▓▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▓░░░░▓▰▰▰▰▰▰▰▓▓▓▓▓▓░░░░▓▓▓▓▓▓▓▓▓▓▓",
    "▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄░░░░░▓▓▓▓████░░░░░░░░░░░░░░░░░░░",
    "――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――▇▇▇▇▇▆▇▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂",
    "||||||||||||||||||||||||||||||||||||||||||||||||||░░▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓███ ███▓▓▓",
    "░░░▒▒▒――++++―++++░░░▓++―▓█――+█++++―▒▒▒░░░ █▰▰▰     ░    ░   ░      ░  █   ░  █   ░    ",
    "――――――――――――▂▃░░▓▓▓▓▓▓▓▓▓▒▒░░▃▂▂▂▂▂▂▂▂▂▂▂",
    "+++++▓▓++++++++++++++++++++++++++▓▓▓▓+++++++++▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
    "▂▃▅▅▃▂▟███████████████████████████████████▙▂▃▅▅▃▂",
    "▄▄▄▄▆▆▆██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▄▌▌▌▌▄▄▄▄░░░░░▓▓▓▓████",
    "▓▓▓▓▓▓░░░░░░██████████+█████████████████+████████▓▓▓▓▓▓░░░░░░",
    "▂▃▅▅▃▂▂                    ▂▂▂▂▟████████████████████████████████████████████████▙",
    "█▌▐▄▀░▒░▒░▒░▒░▒░▒░▒░▒░▒░▒░░▒▒▒░░░░░░░░░░▒▒▒▒▓▓▓▓▓▓▓▓▒▒▒▒░░░░░▒░▒░▒░▒░▒░▓▓▓▓▓▓▓▓▒░▒░▒░▒░▒░▒░▒░▒░▒░▒▓▓",
    "█▌█▌█▌█▌█▌█▌█▌█▌▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐ ▐――▐――▐――▐――▐――▐――▐――▐――▐――▐――▐―――――――――――――▓▓▓▓▓▓▓▓▓▓",
    "▓▓▓▓+░░░░░░░░░░▓▓▓▓+░░░░░░░░░░▓▓▓▓+▓▓+▓▓+▓▓+░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░░░░░",
    "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▓▓▓░░░▒▒▒▓▓▓░░░████████████    █    ████████████▒▒▒▓▓▓░░░▒▒▒▓▓▓░░░▒▒▒▓▓▓░░░▒▒▒▓▓▓",
    "▆▇ ▆▇ ▆░░▇ ▆▇ ▆ ▇ ▆ ▇░░░░―░―░―░―░―░░░░▆▇ ▆ ▇░░▆▇▆ ▇▆▇▆▇   ―    ―    ―  ░―░―░░░░",
    "▓▓▓▓▓▓░░░░░░▓▓▓▓▓▓░░░░░░▓▓▓▓▓▓░░░░░░―――░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓░▓",
    "▒▓█    ▒▓█   ▒▓██   ▒▓██ ▒▓██  ▒▓█  ██████    █    █████▒▒▒▓▓▓░░░▒▒▒▓▓▓░░░▒▒▒▓▓▓░░░▒▒▒▓▓▓",
    "█▌▁▁▁▟▙▟▙▟▙▟▙▟▙▟▙▁▁▐▄▀▐▄▀▐▄▀▐▄▀▐▄▀▄▀░▒▓▓",
    "░░░▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰",
    "█▌█▌█▌█▌█▌█▌█▌█▌▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐ ――――――――――――▓▓▓▓▓▓▓▓▓▓",
    "   ███████    █    █  █    ▓▓  ▓▓  ▓▓",
    "||░░++▓▓――▆▇",
];
let patternBlade = bladeRailSequencer[(BIOME + SEED) % bladeRailSequencer.length].split("");
patternBlade = patternBlade.map((s) => (s == "▰" ? "░" : s));
console.log("\nBLADE: " + patternBlade.join("") + "\nBIOMECODE: " + BIOMECODE.join(""), "\nZONE: " + ZONE, "\nBIOME:", BIOME + ",\nSEED:", SEED + ",\nCHROMA:", CHROMA);
let isXSeed = false;
let isYSeed = false;
if (SEED > 9950 && SEED <= 9970) {
    isYSeed = true;
}
if (isOrigin) {
    if (SEED > 9e3) {
        isXSeed = true;
        for (let u of uni) {
            seedSet.push(makeSet(u));
        }
    } else {
        seedSet.push(makeSet(uni[Math.floor(SEED) % uni.length]));
    }
} else {
    if (SEED > 9970) {
        isXSeed = true;
        for (let u of uni) {
            seedSet.push(makeSet(u));
        }
    } else if (true) {
        if (isYSeed) {
            seedSet.push(makeSet(uni[Math.floor(SEED) % 3]).reverse());
        } else {
            seedSet.push(patternBlade);
        }
    }
}
if (isOrigin && !isXSeed && (isDaydream || isTerraformed)) {
    let xtraPattern = [];
    let countPatternSets = [
        [16, 16, 16, 2, 2, 2, 2, 4, 4, 4, 4],
        [16, 32, 8, 16, 2, 2, 2, 2, 4, 4, 4, 4],
        [2, 4, 2, 4, 2, 24, 8, 8, 8, 8, 4, 4, 2],
        [2, 2, 2, 2, 2, 8, 8, 8, 8, 4, 4, 4],
        [12, 4, 2, 8, 8, 4, 4, 4, 8, 4, 4, 4],
        [24, 4, 4, 2],
        [8, 4, 4, 2],
        [2, 8, 2, 2, 8, 2, 2, 2, 8, 4, 4, 4],
        [5, 5, 5, 5],
        [7, 7, 7, 7],
    ];
    let countPattern = countPatternSets[SEED % countPatternSets.length];
    let i = 0;
    for (let count of countPattern) {
        for (let j = 0; j < count; j++) {
            let set = seedSet[SEED % seedSet.length];
            let chr = set[(SEED + i) % set.length];
            xtraPattern.push(chr);
        }
        i++;
    }
    seedSet.push(xtraPattern);
}
for (let set of seedSet) {
    charSet.push(set);
}
charSet = charSet.flat(1e3);
let mainSet = originalChars.reverse();
if (SEED > 9950) {
    overdrive = true;
    mainSet = charSet;
}
let drive = map(clamp(SEED, 400, 1e4), 0, 1e4, 0.1, 0.2);
if (SEED > 9950 && isOrigin) {
    drive = 0.888;
} else if (SEED > 9e3 && isOrigin) {
    drive = 0.22;
} else if (SEED > 9950) {
    drive *= 1.1;
}
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTablet = /iPad|Tablet|Kindle|PlayBook/i.test(navigator.userAgent);
const isInIframe = window.self !== window.top;
let gridEls = document.querySelectorAll("p");
let bgEl = document.querySelector(".r");
if (isDaydream) {
    bgEl.style.cursor = "crosshair";
}
let hyperSelect = isTerrain || isTerraformed;
let ptr = { x: 0.5, y: 0.5, p: 1 };
let br = { s: 3, h: 0, isEraser: false, isAutoHeight: true, ephem: false, usePressure: false, buffers: [1, 3, 5, 7, 9, 13].map((s) => makeRoundBrush(s)) };
function draw(el, v) {
    if (v > 0) {
        el.h < 9 ? (el.h = Math.max(el.h, v % 10)) : (el.h = v % 10);
        let cl = classIds[Math.min(el.h, classIds.length - 1)];
        el.activeClass = cl;
        el.setAttribute("class", cl);
    }
}
function erase(el, v) {
    if (v != 0) {
        el.activeClass = "j";
        el.setAttribute("class", "j");
        el.h = 9;
        el.textContent == " ";
    }
}
let hShift = 0;
let vShift = 0;
let tEl;
function paintEl(el, b) {
    hShift = (b.length - 1) / 2;
    for (let x = 0; x < b.length; x++) {
        vShift = (b[x].length - 1) / 2;
        for (let y = 0; y < b[x].length; y++) {
            tEl = gridEls[Math.min(Math.max(0, el.r + y - vShift), 31) + Math.min(Math.max(0, el.c + x - hShift), 31) * 32];
            br.isEraser ? erase(tEl, b[x][y]) : draw(tEl, b[x][y] % 10);
        }
    }
}
function makeRoundBrush(size) {
    let buffers = [];
    for (let i = 0; i < 7; i++) {
        let buffer = [];
        let oddWidth = size;
        let oddHeight = size;
        for (let bx = 0; bx < oddWidth; bx++) {
            let barr = [];
            buffer.push(barr);
            for (let by = 0; by < oddHeight; by++) {
                let brushPixelVal = Math.floor(3 - (dist(bx + 0.5, by + 0.5, oddWidth / 2, oddHeight / 2) / oddWidth) * 5);
                brushPixelVal <= 0 ? (buffer[bx][by] = 0) : (buffer[bx][by] = Math.min(brushPixelVal + i, 9));
            }
        }
        buffers.push(buffer);
    }
    return buffers;
}
let brushSpeeds = [".15", ".3", ".05", ".025", ".033"];
let heightSpeeds = [];
for (let i = 0; i <= 9; i++) {
    heightSpeeds[i] = brushSpeeds[i % brushSpeeds.length];
}
let brushSpeedIndex = 0;
function setBrushShiftSpeed(speed) {
    brushSpeedIndex = speed;
}
for (let c = 0; c < 32; c++) {
    for (let r = 0; r < 32; r++) {
        let el = gridEls[r + c * 32];
        el.c = c;
        el.r = r;
        el.m1 = 0;
        el.originalClass = el.className;
        el.activeClass = el.originalClass;
        el.originalChar = el.textContent;
        let windowStyle = window.getComputedStyle(el, null).getPropertyValue("font-size");
        el.originalFontSize = windowStyle;
        el.h = classIds.indexOf(el.originalClass);
        el.originalH = el.h;
        if (isDaydream) {
            el.style.webkitUserSelect = "none";
            el.style.userSelect = "none";
        }
        el.style.msTouchAction = "none";
        el.style.touchAction = "none";
        el.onpointerenter = (ev) => {
            ev.preventDefault();
            ptr.x = ev.clientX / window.innerWidth;
            ptr.y = ev.clientY / window.innerHeight;
            if (ev.pointerType == "pen" && ev.pressure > 0) {
                ptr.p = ev.pressure;
                if (br.usePressure) {
                    br.s = Math.floor(ptr.p * (br.buffers.length - 2));
                }
            }
            if (ev.buttons > 0 && isDaydream) {
                paintEl(el, br.buffers[br.s][br.h]);
            }
        };
    }
}
function heightmapToContractString(heightmap) {
    let flat = heightmap.flat(9999);
    if (flat.length != 1024) {
        throw "Invalid heightmap";
    }
    let result = [];
    for (let i = 0; i < 16; i++) {
        let next = "";
        for (let j = 0; j < 64; j++) {
            current = flat[i * 64 + j];
            next = next + current.toString();
        }
        result.push(next);
    }
    return result;
}
function contractStringToHeightmap(contractString) {
    if (contractString.length != 16) {
        throw "Invalid input";
    }
    let result = [];
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 2; j++) {
            let next = [];
            next = contractString[i].slice(32 * j, 32 * (j + 1));
            next = next.split("");
            next = next.map(Number);
            result = result.concat(next);
        }
    }
    return result;
    console.log();
}
function writeContractHeightmapToGrid(contractString) {
    let heights = contractStringToHeightmap(contractString);
    for (let i = 0; i < gridEls.length; i++) {
        let el = gridEls[i];
        el.h = heights[i];
        let cl = classIds[Math.min(el.h, classIds.length - 1)];
        el.activeClass = cl;
        el.setAttribute("class", cl);
        el.style.fontSize = el.originalFontSize;
    }
    resetCSS();
}
function resetCSS() {
    if (isDaydream && !isPlague && !br.ephem) {
        for (let id of classIds) {
            id = "." + id;
            cssMod(id, "animation-name: f");
            setTimeout(() => {
                cssMod(id, "animation-name: x");
            }, 10);
        }
    }
}
setTimeout(function () {
    if (MODE > 0 && ATTUNEMENT >= 0 && CHROMA == "Flow" && (ZONE == "Alto" || ZONE == "Holo" || ZONE == "Radiant")) {
        for (let i = 0; i < classIds.length; i++) {
            let id = "." + classIds[i];
            cssMod(id, "animation-timing-function: steps(1)");
        }
    }
}, 17);
document.addEventListener("keydown", (e) => {
    if (e.key == "e") {
        br.isEraser = true;
    } else if (e.key == "h") {
        br.isAutoHeight = !br.isAutoHeight;
    } else if (e.key == ",") {
        br.usePressure = !br.usePressure;
    } else if (e.key == "m") {
        br.ephem = !br.ephem;
    } else if (e.key == "q") {
        br.s = Math.max(br.s - 1, 0);
    } else if (e.key == "w") {
        br.s = Math.min(br.s + 1, br.buffers.length - 1);
    } else if (e.key == "s") {
        br.h = Math.min(br.h + 1, br.buffers[br.s].length - 1);
    } else if (e.key == "a") {
        br.h = Math.max(br.h - 1, 0);
    } else if (e.key == "1") {
        br.s = 0;
    } else if (e.key == "2") {
        br.s = 1;
    } else if (e.key == "3") {
        br.s = 2;
    } else if (e.key == "4") {
        br.s = 3;
    } else if (e.key == "5") {
        br.s = 4;
    } else if (e.key == "6") {
        br.s = 5;
    } else if (e.key == "7") {
        setBrushShiftSpeed(1);
    } else if (e.key == "8") {
        setBrushShiftSpeed(2);
    } else if (e.key == "9") {
        setBrushShiftSpeed(3);
    } else if (e.key == "0") {
        setBrushShiftSpeed(4);
    }
    sendState();
    if (e.key == "p" && !isTerraformed) {
        let bufferArray = heightmapToContractString(Array.from(gridEls).map((el) => el.h));
        console.log("Heightmap:");
        console.log(bufferArray);
        window.parent.postMessage({ type: "heightmapString", state: bufferArray }, "*");
        if (navigator.clipboard) {
            navigator.clipboard.writeText(bufferArray).then(
                () => {},
                () => {
                    console.error("Clipboard failed");
                }
            );
        } else {
            console.error("Clipboard write disabled, check origin");
        }
    } else if (e.key == "c" && (MODE == 1 || MODE == 3)) {
        gridEls.forEach((el) => erase(el));
    }
});
document.addEventListener("keyup", (e) => {
    if (e.key == "e") {
        br.isEraser = false;
        resetCSS();
        sendState();
    }
});
document.body.onpointerdown = (e) => {
    if (hyperSelect) {
        return;
    }
    e.preventDefault();
    e.target.releasePointerCapture(e.pointerId);
};
document.body.onpointerup = (e) => {
    e.preventDefault();
    resetCSS();
    if (br.isAutoHeight) {
        br.h = (br.h + 1) % br.buffers.length;
    }
    sendState();
};
window.addEventListener("message", function (event) {
    let msg = event.data;
    if (msg.header == "tf") {
        if (msg.type == "tf-writeHeightmap") {
            writeContractHeightmapToGrid(msg.heightmap);
        }
        if (msg.type == "tf-writeState") {
            br = msg.state;
            console.log("updated: ");
            console.log(br);
        }
    }
});
function sendState() {
    window.parent.postMessage({ type: "tf-stateUpdate", state: br }, "*");
}
sendState();
let charIndex = 0;
let airship = 0;
let timeSample = 0;
let t;
function terraLoop() {
    requestAnimationFrame(terraLoop);
    for (let c = 0; c < 32; c++) {
        for (let r = 0; r < 32; r++) {
            t = gridEls[r + c * 32];
            if (isTerrain) {
                if (t.h > 6 - RESOURCE) {
                    charIndex = Math.floor(airship * 0.125 + (t.h + 0.5 * c + 0.1 * DIRECTION * r)) % mainSet.length;
                    if (charIndex > coreCharsetLength && isOrigin) {
                        t.style.fontSize = "18px";
                    } else if (charIndex > coreCharsetLength) {
                        t.style.fontSize = "22px";
                    } else {
                        t.style.fontSize = t.originalFontSize;
                    }
                    t.textContent = mainSet[charIndex];
                }
            } else if (isDaydream || isTerraformed) {
                if (ANTENNA > 0) {
                    t.m1 = dist(c, 15.5, r, c) + airship * 0.05 * SEED * 0.00045;
                } else {
                    t.m1 = Math.floor((airship * drive) % charSet.length);
                }
                if (t.h == 0) {
                    charIndex = Math.abs(Math.floor(t.m1));
                    t.textContent = mainSet[charIndex % mainSet.length];
                } else {
                    charIndex = Math.floor(airship * brushSpeeds[brushSpeedIndex] - t.h) % charSet.length;
                    t.textContent = charSet[charIndex];
                    if (charIndex > coreCharsetLength && isOrigin) {
                        t.style.fontSize = "18px";
                    } else if (charIndex > coreCharsetLength) {
                        t.style.fontSize = "22px";
                    } else {
                        t.style.fontSize = t.originalFontSize;
                    }
                    if (t.originalClass == "j" || t.activeClass == "j") {
                        t.textContent = " ";
                    }
                }
            }
        }
    }
    const now = Date.now();
    const dt = now - (timeSample || now);
    timeSample = now;
    airship += 0.1 * dt;
}
terraLoop();
