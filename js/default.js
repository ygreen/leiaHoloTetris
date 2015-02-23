// Leia constants
var _colorMode = "color";
var activeShape = new THREE.Object3D();

var _ZDPNormal = {
    x: 0.00,
    y: 0.00,
    z: 1.00
};
var _ZDPDistanceToCamera = 500.00;
var _ZDPCenter = {x:0.00,y:0.00,z:0.00};
var _ZDPSize = 40.00;

var _maxDisparity = 10.00;
var _baselineScale = 1.00;

//read only
var _up = 7.39;
var _down = -7.62;
var _camPosition = {x:0.00,y:0.00,z:500.00};

var camera, renderer, scene;
var tetrisWorld;

// Game constants
var KEY = {ESC:27, SPACE:32, LEFT:37, UP:38, RIGHT:39, DOWN:40, SHIFT:16, S:83, A:65, X:88},
    DIR = {UP:0, RIGHT:1, DOWN:2, LEFT:3, MIN:0, MAX:3, DROP:4},
    SHAPE = {T:0, I:1, L:2, J:3, S:4, Z:5, H:6};

var playing = false;
var cubeSize = 3;
var floor = -11;
var ceiling = 13;
var cubeHeight = 0;
var evntRotate = new CustomEvent("rotate");
var deadShapes = [];

var temp;

// Convenience functions
function log(message) {
    console.log(message);
}

function CircularLinkedList() {
    this.Node = null;
    this.count = 0;
    this.head = null;
}

CircularLinkedList.prototype.append = function(value) {
    var node = {
        value: value,
        next: this.head
    };

    if (this.count === 0) {
        this.head = {};
        this.head.value = value;
        this.head.next = this.head;
        this.tail = this.head;
    } else {
        this.tail.next = node;
        this.tail = node;
    }

    this.count++;
};

CircularLinkedList.prototype.getSize = function () {
    console.log(this);
};

CircularLinkedList.prototype.getIndex = function (index) {
    var ptr = this.head;
    for(x=0; x < index; x++) {
        ptr = ptr.next;
    }
    return ptr;
};

CircularLinkedList.prototype.close = function () { //Don't call this. IT blows things up.
    var ptr = this.head;
    while (ptr.next != null) {
        ptr = ptr.next;
    }
    ptr.next = this.head;
};

CircularLinkedList.prototype.createNode = function(value) {
    var node = {};
    node.value = value;
    node.next = null;
    return node;
};

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Init() {
    LEIA.virtualScreen.Init();

    LEIA.virtualScreen.width = 40;
    LEIA.virtualScreen.center.copy({x:0.00,y:0.00,z:0.00});
    //LEIA.virtualScreen.normal.copy({x:0.20,y:-0.20,z:1.00});
    LEIA.virtualScreen.normal.copy({x:0.00,y:0.00,z:1.00});
    LEIA.virtualScreen.b = 1.0;
    LEIA.virtualScreen.d = 500;
    LEIA.virtualScreen.disp = 10;
    LEIA.virtualScreen.h = 0;
    LEIA.virtualScreen.setShiftXY(4,3);
    LEIA.physicalScreen.resolution = new THREE.Vector2(200,150);

    scene = new THREE.Scene();

    // camera setup
    camera = new LeiaCamera({
        dCtoZDP: LEIA.virtualScreen.d,
        zdpNormal: LEIA.virtualScreen.normal,
        targetPosition: LEIA.virtualScreen.center
    });
    scene.add(camera);

    // rendering setup
    renderer = new LeiaWebGLRenderer({
        antialias: true,
        renderMode: _renderMode,
        colorMode: _colorMode,
        devicePixelRatio: 1,
        superSampleSharpen:false,
        messageFlag: _targetEnvironment
    });
    renderer.shadowMapEnabled = true;
    // renderer.shadowMapType = THREE.BasicShadowMap;
    Leia_addRender(renderer, {
        bFPSVisible: true
    });

    //add object to scene
    addObjectsToScene();

    //add Light
    addLights();
    addEvents();

    startGame();
}

function animate() { //called every millisecond
    requestAnimationFrame(animate);
    renderer.Leia_render({
        scene: scene,
        camera: camera
    });
}

function addEvents() {
    document.addEventListener('keydown', keydown, false);
    //window.addEventListener('resize', resize, false);
}

function startGameLoop() {
    interval = setInterval('handleGameTick()', 1000);
}

function stopGameLoop() {
    window.clearInterval(interval);
}

function startGame() {
    log("Starting game...");
    activeShape.visible = true;
    startGameLoop();
    playing = true;
}

function stopGame() {
    log("Stopping game");
    stopGameLoop();
    playing = false;
}

function handleGameTick() {
    //log("Tick!");
    move(activeShape);
}

function keydown(ev) {
    //log(ev.keyCode);
    var handled = false;
    if (playing) {
        switch (ev.keyCode) {
            case KEY.LEFT:
                move(activeShape,DIR.LEFT);
                handled = true;
                break;
            case KEY.RIGHT:
                move(activeShape,DIR.RIGHT);
                handled = true;
                break;
            case KEY.UP:
                rotate(activeShape);
                handled = true;
                break;
            case KEY.DOWN:
                move(activeShape,DIR.DOWN);
                handled = true;
                break;
            case KEY.SHIFT:
                //drop();
                move(activeShape);
                handled = true;
                break;
            case KEY.S:
                stopGame();
                break;
            case KEY.A:
                if( activeShape.position.y <= -3 ) { //Ugly-ness prevention hack
                    activeShape = addShapeToScene();
                }
                break;
            case KEY.X:
                //log(temp);
                log(getShapeCoordinates(activeShape));
                break;
            case KEY.ESC:
                //lose();
                handled = true;
                break;
        }
    }
    else if (ev.keyCode == KEY.S) {
        startGame();
        handled = true;
    }
    if (handled) {
        ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
    }
}

function rotate(shape) { //Triggered by keboard events
    //var angle = [0, -Math.PI/2, -Math.PI, Math.PI*2];

    if( shape.type != SHAPE.H ) {
        //shape.rotation.z -= Math.PI/2;
        shape.rotateOnAxis(new THREE.Vector3(0,0,1), Math.PI/2);
        shape.dispatchEvent(evntRotate);

        var widestPoints = getWidestEdgePoints(shape);
        if( widestPoints.l >= -LEIA.virtualScreen.width/2 && widestPoints.r < LEIA.virtualScreen.width/2 ) {
            log("Rotation allowed");
        } else {
            log("Rotation blocked");
        }
    }

    //var time = Date.now() *0.001;
    //var omega = 0.3;
    //shape.rotation.z = omega*time;
}

function handleRotation(shape) { //Triggered by the event dispatcher
    shape.orientation = shape.orientation == 3 ? 0 : shape.orientation+1;
    getLocalCoords(shape);
}

function move(shape, direction) {

    if( hasCollided(activeShape) ) {
        log("Collision detected");
        deadShapes[deadShapes.length] = activeShape;
        activeShape = addShapeToScene();
        return;
    }

    if( hasReachedFloor(activeShape) ) {
        log("Floor reached");
        deadShapes[deadShapes.length] = activeShape;
        activeShape = addShapeToScene();
    }

    var widestPoints = getWidestEdgePoints(shape);
    switch(direction){
        case DIR.LEFT:
            if( widestPoints.l >= -(LEIA.virtualScreen.width/2-3) ) {
                shape.position.x -= cubeSize;
            } else {
                log("Hit left edge");
            }
            break;
        case DIR.RIGHT:
            if( widestPoints.r < (LEIA.virtualScreen.width/2)-3) {
                shape.position.x += cubeSize;
            } else {
                log("Hit right edge");
            }
            break;
        case DIR.DROP:
            log("drop");
            break;
        default:
            shape.position.y -= cubeSize;
            break;
    }
}

function getShapeCoordinates(shape) {
    var vector = new THREE.Vector3();
    var coords = [];
    for(var x=0; x < shape.children.length; x++) {
        vector.setFromMatrixPosition(shape.children[x].matrixWorld);
        coords[x] = {x: vector.x, y: vector.y};
    }
    return coords;
}

function getWidestEdgePoints(shape) {
    var lCoord = Number.POSITIVE_INFINITY;
    var rCoord = Number.NEGATIVE_INFINITY;
    var vector = new THREE.Vector3();

    for(var x=0; x < shape.children.length; x++) {
        vector.setFromMatrixPosition(shape.children[x].matrixWorld);
        lCoord = vector.x < lCoord ? vector.x : lCoord;
        rCoord = vector.x > rCoord ? vector.x : rCoord;
    }

    return {l:lCoord,r:rCoord};
}

function willCollideNextMove(thisCoordObj, thatCoordObj) {
    return thisCoordObj.x == thatCoordObj.x && thisCoordObj.y-cubeSize == thatCoordObj.y;
}

function hasCollided(shape) {
    for(var x = 0; x < deadShapes.length; x++) {
        var deadShapeCoords = getShapeCoordinates(deadShapes[x]);
        var activeShapeCoords = getShapeCoordinates(shape);

        for( var n = 0; n < activeShapeCoords.length; n++ ) {
            for(var m = 0; m < deadShapeCoords.length; m++) {
                if( willCollideNextMove(activeShapeCoords[n],deadShapeCoords[m]) ) {
                    return true;
                }
            }
        }
    }
    return false;
}

function hasReachedFloor(shape) {
    var coords = getShapeCoordinates(shape);
    var lowestCoord = Number.POSITIVE_INFINITY;
    for(var x=0; x < coords.length; x++) {
        lowestCoord = coords[x].y < lowestCoord ? coords[x].y : lowestCoord;
    }

    return lowestCoord <= floor;
}

var shapePositionAlgos = [];
var li = new CircularLinkedList();
li.append({x:"shape.position.x", y:"shape.position.y"});
li.append({x:"-(cubeSize+shape.position.x)", y:"shape.position.y"});
li.append({x:"shape.position.x", y:"cubeSize+shape.position.y"});
li.append({x:"cubeSize+shape.position.x", y:"shape.position.y"});

shapePositionAlgos[SHAPE.T] = li;
//temp = shapePositionAlgos[SHAPE.T].getIndex(2).value.x;
//temp = getLocalCoords(activeShape);

function getLocalCoords(shape) {

    switch(shape.type) {
        case SHAPE.T:
            /*
            shape.children[0].worldX = shape.position.x;
            shape.children[0].worldY = shape.position.y;

            for(var x = 1; x < shape.children.length; x++) {
                shape.children[x].worldX = shapePositionAlgos[SHAPE.T].getIndex(shape.orientation+1).value.x;
                shape.children[x].worldY = shapePositionAlgos[SHAPE.T].getIndex(shape.orientation+1).value.y;
            }
            */
            //log(shape);
        break;
        case SHAPE.I:

        break;
        case SHAPE.L:

        break;
        case SHAPE.J:

        break;
        case SHAPE.S:

        break;
        case SHAPE.Z:

        break;
        case SHAPE.H:

        break;
    }

    return shape;
}

function genCube(color, newSize) {
    var wrapper = new THREE.Object3D();
    var size = newSize | cubeSize;
    var box = new THREE.BoxGeometry(size,size,size);
    var material = new THREE.MeshBasicMaterial( {color: color} );

    var mesh = new THREE.Mesh(box, material);
    mesh.castShadow = true;

    //mesh.position.set(bbx, bby, bbz);
    //log(mesh.position);
    wrapper.add(mesh);
    return wrapper;
}

function genShape(type) {
    var shape = new THREE.Object3D();
    shape.type = type;
    shape.orientation = 0; //group.orientation = group.orientation == 3 ? 0 : group.orientation++;
    shape.addEventListener("rotate", function(e) { handleRotation(shape); }, false);
    var c;

    activeShape.type = type; //Cache the type
    switch(type) { //TODO: Refactor into a for() later...
        case SHAPE.T:
            log("Generating a T");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(-cubeSize,0,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(0,cubeSize,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(cubeSize,0,0);
            shape.add(c);

            break;
        case SHAPE.I:
            log("Generating an I");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(0,cubeSize,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(0,-cubeSize,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(0,cubeSize*2,0);
            shape.add(c);
            break;
        case SHAPE.L:
            log("Generating an L");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(-cubeSize,0,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(-cubeSize*2,0,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(0,cubeSize,0);
            shape.add(c);
            break;
        case SHAPE.J:
            log("Generating a J");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(cubeSize,0,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(cubeSize*2,0,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(0,cubeSize,0);
            shape.add(c);
            break;
        case SHAPE.S:
            log("Generating an S");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(-cubeSize,0,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(0,cubeSize,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(cubeSize,cubeSize,0);
            shape.add(c);
            break;
        case SHAPE.Z:
            log("Generating a Z");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(cubeSize,0,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(0,cubeSize,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(cubeSize,cubeSize,0);
            shape.add(c);
            break
        case SHAPE.H:
            log("Generating an H");
            c = genCube("red");
            c.position.set(0,0,0);
            shape.add(c);

            c = genCube("green");
            c.position.set(cubeSize,0,0);
            shape.add(c);

            c = genCube("blue");
            c.position.set(0,cubeSize,0);
            shape.add(c);

            c = genCube("yellow");
            c.position.set(cubeSize,cubeSize,0);
            shape.add(c);
            break;
    }
    return shape;
}

function addShapeToScene() {
    var shape = genShape( getRandomInt(0,6) );
    //var shape = genShape( SHAPE.T );
    tetrisWorld.add(shape);
    shape.position.y = ceiling;

    log(shape);

    return shape;
}

function addObjectsToScene() { // Add your objects here
    // background Plane
    var plane = Leia_createTexturePlane({
        filename: 'resource/brickwall_900x600_small.jpg',
        width: 44,
        height: 33
    });
    plane.position.z = -5;
    plane.castShadow = true;
    plane.receiveShadow = true;
    scene.add(plane);

    activeShape = addShapeToScene();
    activeShape.visible = false;

    //log(group.children[0].material);
    //group.children[0].material.color = "blue";
    //group.children[0].visible = true;
    //group.children.splice(0,1);

    scene.add(tetrisWorld);
}

function addLights() {
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-30, 30, 70);
    spotLight.shadowCameraVisible = false;
    spotLight.castShadow = true;
    spotLight.shadowMapWidth = spotLight.shadowMapHeight = 256;
    spotLight.shadowDarkness = 0.7;
    scene.add(spotLight);

    var ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);
}
