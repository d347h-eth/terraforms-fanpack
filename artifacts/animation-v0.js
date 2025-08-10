let MODE = 0;
let RESOURCE = 47823;
let DIRECTION = 4;
const SEED = 2128;

function map(e, t, r, i, a) {
    return i + (a - i) * (e - t) / (r - t)
}
RESOURCE /= 1e4;
let isDaydream = 1 == MODE || 3 == MODE,
    isTerraformed = 2 == MODE || 4 == MODE,
    isOrigin = 3 == MODE || 4 == MODE,
    classIds = ['i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'],
    charSet = [],
    uni = [9600, 9610, 9620, 3900, 9812, 9120, 9590, 143345, 48, 143672, 143682, 143692, 143702, 820, 8210, 8680, 9573, 142080, 142085, 142990, 143010, 143030, 9580, 9540, 1470, 143762, 143790, 143810];

function makeSet(e) {
    let t = [];
    for (let r = e; r < e + 10; r++) t.push(String.fromCharCode(r));
    return t
}
let newSet, originalChars = [];
for (let e of classIds) {
    let t = document.querySelector('.' + e);
    if (t) {
        let e = t.textContent;
        originalChars.push(e)
    }
}
if (charSet.push(originalChars), isOrigin)
    if (SEED > 9e3)
        for (let e of uni) charSet.push(makeSet(e));
    else charSet.push(makeSet(uni[Math.floor(SEED) % uni.length]));
else if (SEED > 9970)
    for (let e of uni) charSet.push(makeSet(e));
else SEED > 5e3 && charSet.push(makeSet(uni[Math.floor(SEED) % 3]));
charSet = charSet.flat();
let mainSet = originalChars.reverse();
SEED > 9950 && (mainSet = charSet);
let gridEls = document.querySelectorAll('p'),
    grid = [],
    brushSize = 2,
    pointerDown = !1,
    pointerShift = 0,
    isEraser = !1,
    loopLength = 10,
    airship = 0;

function erase(e) {
    e.activeClass = 'j', e.setAttribute('class', 'j'), e.h = 9, e.textContent
}

function draw(e) {
    let t = classIds[pointerShift % classIds.length];
    e.activeClass = t, e.setAttribute('class', t), e.h = pointerShift % classIds.length
}
for (let e = 0; e < 32; e++) {
    grid.push([]);
    for (let t = 0; t < 32; t++) {
        let r = gridEls[t + 32 * e];
        grid[e][t] = r, r.originalClass = r.className, r.activeClass = r.originalClass, r.h = classIds.length - classIds.indexOf(r.originalClass) - 1, r.originalH = r.h, isDaydream && (r.style.webkitUserSelect = 'none', r.style.userSelect = 'none'), r.onpointermove = (i => {
            if (pointerDown && isDaydream) {
                for (let r = -brushSize; r < brushSize; r++)
                    for (let i = -brushSize; i < brushSize; i++) {
                        let a = grid[Math.min(Math.max(0, e + r), 31)][Math.min(Math.max(0, t + i), 31)];
                        isEraser ? erase(a) : draw(a)
                    }
                isEraser ? erase(r) : draw(r)
            }
        })
    }
}
let speedFac = SEED > 6500 ? 30 : 1;
setInterval(() => {
    for (let e = 0; e < 32; e++)
        for (let t = 0; t < 32; t++) {
            let r = gridEls[t + 32 * e];
            0 == MODE ? r.h > 6 - RESOURCE && (r.textContent = mainSet[Math.floor(.25 * airship + (r.h + .5 * e + .1 * DIRECTION * t)) % mainSet.length]) : (isDaydream || isTerraformed) && (0 == r.h ? SEED < 8e3 ? r.textContent = mainSet[Math.floor(airship / 1e3 + .05 * e + .005 * t) % mainSet.length] : r.textContent = mainSet[Math.floor(airship / 2 + .05 * e) % mainSet.length] : (r.textContent = charSet[Math.floor(airship / speedFac + e + r.h) % charSet.length], SEED > 5e3 && Math.random() < .005 && (r.style.fontSize = `${3+airship%34}px`))), 'j' != r.originalClass && 'j' != r.activeClass || (r.textContent = ' ')
        }
    airship += 1
}, loopLength),
document.addEventListener('keyup', e => {
    'e' == e.key && (isEraser = !1)
}),
document.addEventListener('keydown', e => {
    'e' == e.key ? isEraser = !0 : 'q' == e.key ? brushSize = (brushSize + 1) % 4 : 'a' == e.key && pointerShift++
}),
document.querySelector('svg').onpointerdown = (() => {
    pointerShift++, pointerDown = !0
}),
document.querySelector('svg').onpointerup = (() => {
    pointerDown = !1;
    for (let e of gridEls) e.style.animation = 'none', e.offsetHeight, e.style.animation = null
}),
document.querySelector('svg').onpointerleave = (() => {
    pointerDown = !1
});
