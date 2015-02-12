var camera, renderer, scene;
var helloWorld;

function Init() {

  LEIA.virtualScreen.Init();
  //LEIA.virtualScreen.loadDefault();
  
  LEIA.virtualScreen.width = 40;
  LEIA.virtualScreen.center.copy({x:0.00,y:0.00,z:0.00});
  LEIA.virtualScreen.normal.copy({x:0.00,y:0.00,z:1.00});
  LEIA.virtualScreen.b = 1.0;
  LEIA.virtualScreen.d = 500;
  LEIA.virtualScreen.disp = 5;
  LEIA.virtualScreen.h = 1/10.0; 
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
}

function animate() {
  requestAnimationFrame(animate);

  //helloWorld.rotation.x = 0.8 * Math.sin(5.0 * LEIA.time);
  //helloWorld.rotation.z = 0.6 * 0.6 * Math.sin(3.0 * LEIA.time);
  
  renderer.Leia_render({
    scene: scene,
    camera: camera
  });
}

function addObjectsToScene() { // Add your objects here
  // background Plane
  var plane = Leia_createTexturePlane({
    filename: 'resource/brickwall_900x600_small.jpg',
    width: 44,
    height: 33
  });
  plane.position.z = -3;
  plane.castShadow = true;
  plane.receiveShadow = true;
  scene.add(plane);

  // hello world text
  var helloWorldGeometry = new THREE.TextGeometry(
    "Hello", {
      size: 10,
      height: 3,
      curveSegments: 4,
      font: "helvetiker",
      weight: "normal",
      style: "normal",
      bevelThickness: 0.5,
      bevelSize: 0.25,
      bevelEnabled: true,
      material: 0,
      extrudeMaterial: 1
    }
  );
  helloWorldGeometry.computeBoundingBox();
  var hwbb = helloWorldGeometry.boundingBox;
  var hwbbx = -0.5 * (hwbb.max.x - hwbb.min.x);
  var hwbby = -0.5 * (hwbb.max.y - hwbb.min.y);
  var hwbbz = -0.5 * (hwbb.max.z - hwbb.min.z);
  var helloWorldMaterial = new THREE.MeshFaceMaterial(
        [
            new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shading: THREE.FlatShading
      }), // front
            new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shading: THREE.SmoothShading
      }) // side
        ]
  );
  var helloWorldMesh = new THREE.Mesh(helloWorldGeometry, helloWorldMaterial);
  helloWorldMesh.castShadow = true;
  helloWorldMesh.position.set(hwbbx, hwbby, hwbbz);
  helloWorld.add(helloWorldMesh);
  scene.add(helloWorld);
}

function addLights() {
  //Add Lights Here
  var spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(0, 70, 70);
  spotLight.shadowCameraVisible = false;
  spotLight.castShadow = true;
  spotLight.shadowMapWidth = spotLight.shadowMapHeight = 256;
  spotLight.shadowDarkness = 0.7;
  scene.add(spotLight);

  var ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);
}
