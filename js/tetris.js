// Game constants
var KEY = {ESC: 27,
        SPACE: 32,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40},
    DIR = {UP: 0,
        RIGHT: 1,
        DOWN: 2,
        LEFT: 3,
        MIN: 0,
        MAX: 3},
    canvas = get('canvas'),
    ctx = canvas.getContext('2d'),
    ucanvas = get('upcoming'),
    uctx = ucanvas.getContext('2d'),
    speed = {start: 0.6, decrement: 0.005, min: 0.1}, // how long before piece drops by 1 row (seconds)
    nx = 10, // width of Tetris court (blocks)
    ny = 20, // height of Tetris court (bblocks)
    nu = 5;  // width/height of upcoming preview (blocks)

var dx, dy,        // Pixel size of a single Tetris block
    blocks,        // 2 dimensional array (nx*ny) representing Tetris court - either empty block or occupied by a piece
    actions,       // Queue of user actions (inputs)
    playing,       // boolean - game is in progress
    dt,            // Starting time
    current,       // The current piece
    next,          // Next piece
    score,         // Current score
    vscore,        // Currently displayed score - catches up to score
    rows,          // Count of completed rows in the current game
    step;          // Single row drop duration

// The pieces
var i = {size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'};
var j = {size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'};
var l = {size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange'};
var o = {size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow'};
var s = {size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'};
var t = {size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple'};
var z = {size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'};

// Leia constants
var _renderMode = 'TuningPanelOn';
var _targetEnvironment = 'IDE';

var _colorMode = "color";

var _ZDPNormal = {
    x: 0.00,
    y: 0.00,
    z: 1.00
};
var _ZDPDistanceToCamera = 500.00;
var _ZDPCenter = {x:0.00,y:0.00,z:0.00};
var _ZDPSize = 40.00;

var _maxDisparity = 5.00;
var _baselineScale = 1.00;

//read only
var _up = 7.39;
var _down = -7.62;
var _camPosition = {x:0.00,y:0.00,z:500.00};

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback, element) {
        window.setTimeout(callback, 1000 / 60);
    }
}

// Convenience functions
function log(message) {
    console.log(message);
}
function get(id) {
    return document.getElementById(id);
}
function hide(id) {
    get(id).style.visibility = 'hidden';
}
function show(id) {
    get(id).style.visibility = null;
}
function html(id, html) {
    get(id).innerHTML = html;
}
function timestamp() {
    return new Date().getTime();
}
function random(min, max) {
    return (min + (Math.random() * (max - min)));
}
function randomChoice(choices) {
    return choices[Math.round(random(0, choices.length - 1))];
}

// Do the bit manipulation and iterate through each occupied block (x,y) for a given piece
function eachblock(type, x, y, dir, fn) {
    var bit, result, row = 0, col = 0, blocks = type.blocks[dir];
    for (bit = 0x8000; bit > 0; bit = bit >> 1) {
        if (blocks & bit) {
            fn(x + col, y + row);
        }
        if (++col === 4) {
            col = 0;
            ++row;
        }
    }
}

function isOccupied(type, x, y, dir) {
    var result = false;
    eachblock(type, x, y, dir, function (x, y) {
        if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x, y)) {
            result = true;
        }

    });
    return result;
}

function isUnoccupied(type, x, y, dir) {
    return !isOccupied(type, x, y, dir);
}

var pieces = [];
function randomPiece() {
    if (pieces.length == 0) {
        pieces = [i, i, i, i, j, j, j, j, l, l, l, l, o, o, o, o, s, s, s, s, t, t, t, t, z, z, z, z];
    }
    var type = pieces.splice(random(0, pieces.length - 1), 1)[0];
    return {type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0};
}

function runTetris() {

    addEvents(); // Initialize the event handlers
    var last = now = timestamp();

    function frame() {
        now = timestamp();
        update(Math.min(1, (now - last) / 1000.0)); // Using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
        draw();
        last = now;
        requestAnimationFrame(frame, canvas);
    }
    resize(); // Setup all our sizing information
    reset();  // Reset the per-game variables
    frame();  // Start the first frame
}

function addEvents() {
    document.addEventListener('keydown', keydown, false);
    window.addEventListener('resize', resize, false);
}

function resize(event) {
    canvas.width = canvas.clientWidth;  // Set canvas logical size equal to its physical size
    canvas.height = canvas.clientHeight;
    ucanvas.width = ucanvas.clientWidth;
    ucanvas.height = ucanvas.clientHeight;
    dx = canvas.width / nx; // Pixel size of a single Tetris block
    dy = canvas.height / ny;
    invalidate();
    invalidateNext();
}

function keydown(ev) {
    var handled = false;
    if (playing) {
        log(ev.keyCode);
        switch (ev.keyCode) {
            case KEY.LEFT:
                actions.push(DIR.LEFT);
                handled = true;
                break;
            case KEY.RIGHT:
                actions.push(DIR.RIGHT);
                handled = true;
                break;
            case KEY.UP:
                actions.push(DIR.UP);
                handled = true;
                break;
            case KEY.DOWN:
                actions.push(DIR.DOWN);
                handled = true;
                break;
            case KEY.ESC:
                lose();
                handled = true;
                break;
        }
    }
    else if (ev.keyCode == KEY.SPACE) {
        play();
        handled = true;
    }
    if (handled) {
        ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
    }

}

function play() {
    hide('start');
    reset();
    playing = true;
}
function lose() {
    show('start');
    setVisualScore();
    playing = false;
}

function setVisualScore(n) {
    vscore = n || score;
    invalidateScore();
}
function setScore(n) {
    score = n;
    setVisualScore(n);
}
function addScore(n) {
    score = score + n;
}
function clearScore() {
    setScore(0);
}
function clearRows() {
    setRows(0);
}
function setRows(n) {
    rows = n;
    step = Math.max(speed.min, speed.start - (speed.decrement * rows));
    invalidateRows();
}
function addRows(n) {
    setRows(rows + n);
}
function getBlock(x, y) {
    return (blocks && blocks[x] ? blocks[x][y] : null);
}
function setBlock(x, y, type) {
    blocks[x] = blocks[x] || [];
    blocks[x][y] = type;
    invalidate();
}
function clearBlocks() {
    blocks = [];
    invalidate();
}
function clearActions() {
    actions = [];
}
function setCurrentPiece(piece) {
    current = piece || randomPiece();
    invalidate();
}
function setNextPiece(piece) {
    next = piece || randomPiece();
    invalidateNext();
}

function reset() {
    dt = 0;
    clearActions();
    clearBlocks();
    clearRows();
    clearScore();
    setCurrentPiece(next);
    setNextPiece();
}

function update(idt) {
    if (playing) {
        if (vscore < score) {
            setVisualScore(vscore + 1);
        }
        handle(actions.shift());
        dt = dt + idt;
        if (dt > step) {
            dt = dt - step;
            drop();
        }
    }
}

function handle(action) {
    switch (action) {
        case DIR.LEFT:
            move(DIR.LEFT);
            break;
        case DIR.RIGHT:
            move(DIR.RIGHT);
            break;
        case DIR.UP:
            rotate();
            break;
        case DIR.DOWN:
            drop();
            break;
    }
}

function move(dir) {
    var x = current.x, y = current.y;
    switch (dir) {
        case DIR.RIGHT:
            x = x + 1;
            break;
        case DIR.LEFT:
            x = x - 1;
            break;
        case DIR.DOWN:
            y = y + 1;
            break;
    }
    if (isUnoccupied(current.type, x, y, current.dir)) {
        current.x = x;
        current.y = y;
        invalidate();
        return true;
    }
    else {
        return false;
    }
}

function rotate() {
    var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
    if (isUnoccupied(current.type, current.x, current.y, newdir)) {
        current.dir = newdir;
        invalidate();
    }
}

function drop() {
    if (!move(DIR.DOWN)) {
        addScore(10);
        dropPiece();
        removeLines();
        setCurrentPiece(next);
        setNextPiece(randomPiece());
        clearActions();
        if (isOccupied(current.type, current.x, current.y, current.dir)) {
            lose();
        }
    }
}

function dropPiece() {
    eachblock(current.type, current.x, current.y, current.dir, function (x, y) {
        setBlock(x, y, current.type);
    });
}

function removeLines() {
    var x, y, complete, n = 0;
    for (y = ny; y > 0; --y) {
        complete = true;
        for (x = 0; x < nx; ++x) {
            if (!getBlock(x, y)) {
                complete = false;
            }
        }
        if (complete) {
            removeLine(y);
            y = y + 1; // recheck same line
            n++;
        }
    }
    if (n > 0) {
        addRows(n);
        addScore(100 * Math.pow(2, n - 1)); // 1: 100, 2: 200, 3: 400, 4: 800
    }
}

function removeLine(n) {
    var x, y;
    for (y = n; y >= 0; --y) {
        for (x = 0; x < nx; ++x)
            setBlock(x, y, (y == 0) ? null : getBlock(x, y - 1));
    }
}

// Rendering
var invalid = {};

function invalidate() {
    invalid.court = true;
}
function invalidateNext() {
    invalid.next = true;
}
function invalidateScore() {
    invalid.score = true;
}
function invalidateRows() {
    invalid.rows = true;
}

function draw() {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.translate(0.5, 0.5); // For crisp(er) shape edges
    drawPlayArea();
    drawNext();
    drawScore();
    drawRows();
    ctx.restore();
}

function drawPlayArea() {
    if (invalid.court) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (playing)
            drawPiece(ctx, current.type, current.x, current.y, current.dir);
        var x, y, block;
        for (y = 0; y < ny; y++) {
            for (x = 0; x < nx; x++) {
                if (block = getBlock(x, y))
                    drawBlock(ctx, x, y, block.color);
            }
        }
        ctx.strokeRect(0, 0, nx * dx - 1, ny * dy - 1); // Reached boundary
        invalid.court = false;
    }
}

function drawNext() {
    if (invalid.next) {
        var padding = (nu - next.type.size) / 2; // Attempt at centering next piece display
        uctx.save();
        uctx.translate(0.5, 0.5);
        uctx.clearRect(0, 0, nu * dx, nu * dy);
        drawPiece(uctx, next.type, padding, padding, next.dir);
        uctx.strokeStyle = 'black';
        uctx.strokeRect(0, 0, nu * dx - 1, nu * dy - 1);
        uctx.restore();
        invalid.next = false;
    }
}

function drawScore() {
    if (invalid.score) {
        html('score', ("00000" + Math.floor(vscore)).slice(-5));
        invalid.score = false;
    }
}

function drawRows() {
    if (invalid.rows) {
        html('rows', rows);
        invalid.rows = false;
    }
}

function drawPiece(ctx, type, x, y, dir) {
    eachblock(type, x, y, dir, function (x, y) {
        drawBlock(ctx, x, y, type.color);
    });
}

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * dx, y * dy, dx, dy);
    ctx.strokeRect(x * dx, y * dy, dx, dy)
}