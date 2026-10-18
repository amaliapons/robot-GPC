

// Variables globales
let scene, camera, cameraTop, renderer, controls;
let robot, base, brazo, antebrazo, pinzaIz, pinzaDe;

// pivote de la muñeca
let muneca;

// materiales y lista de mallas
let wireMaterial;
let meshesRobot = []; 

// GUI y objeto parámetros
let gui;
const params = {
    giroBase: 0,            // [-180 .. 180]  rotación de base en Y
    giroBrazo: 0,           // [-45 .. 45]    rotación de brazo en Z
    giroAntebrazoY: 0,      // [-180 .. 180]  rotación de antebrazo en Y
    giroAntebrazoZ: 0,      // [-90 .. 90]    rotación de antebrazo en Z 
    giroPinza: 0,           // [-40 .. 220]   rotación de la muñeca en Z
    separacionPinza: 10,    // [0 .. 15]      separación entre dedos de la pinza
    alambres: false
};

// movimiento robot sobre el suelo con teclado
const teclas = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const velocidadDesplazamiento = 60;
let reloj;

// control de la animación
let animando = false;

init();
animate();

function init() {
    // Configuración de la escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    //CÁMARA GENERAL perspectiva
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(150, 200, 250);

    // CÁMARA CENITAL ortográficsa
    const alcance = 300;
    cameraTop = new THREE.OrthographicCamera(-alcance, alcance, alcance, -alcance, 1, 2000);
    cameraTop.position.set(0, 800, 0);
    cameraTop.up.set(0, 0, -1); // evitar problema de gimbal al mirar hacia abajo
    cameraTop.lookAt(0, 0, 0);
    cameraTop.updateProjectionMatrix();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // activar mapa de sombras
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // CONTROLES DE CÁMARA
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0); 
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE, // izquierdo -> orbitar
        MIDDLE: THREE.MOUSE.DOLLY,  //rueda -> zoom
        RIGHT: THREE.MOUSE.PAN  //derecho -> desplazar
    };
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.update();
    

    //LUCES
    //Luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Luz direccional
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    
    
    directionalLight.position.set(1, 1, 1).normalize().multiplyScalar(400);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -400;
    directionalLight.shadow.camera.right = 400;
    directionalLight.shadow.camera.top = 400;
    directionalLight.shadow.camera.bottom = -400;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 1200;
    scene.add(directionalLight);
    
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight.target);

    // Luz focal
    const focalLight = new THREE.SpotLight(0xfff2cc, 1.2);
    focalLight.position.set(-180, 350, 150);
    focalLight.angle = Math.PI / 7;
    focalLight.penumbra = 0.35;
    focalLight.distance = 900;
    focalLight.decay = 1.5;
    focalLight.castShadow = true;
    focalLight.shadow.mapSize.width = 1024;
    focalLight.shadow.mapSize.height = 1024;
    focalLight.shadow.camera.near = 10;
    focalLight.shadow.camera.far = 900;
    scene.add(focalLight);
    focalLight.target.position.set(0, 60, 0);
    scene.add(focalLight.target);

    //TEXTURAS
    const cargadorTexturas = new THREE.TextureLoader();

    // Metal para base, eje, disco, mano.
    const texturaMetal = cargadorTexturas.load('texturas/metal.jpg');
    texturaMetal.wrapS = THREE.RepeatWrapping;
    texturaMetal.wrapT = THREE.RepeatWrapping;
    texturaMetal.repeat.set(2, 2);

    // Mate para esparrago y nervios.
    const texturaMate = cargadorTexturas.load('texturas/mate.jpg');
    texturaMate.wrapS = THREE.RepeatWrapping;
    texturaMate.wrapT = THREE.RepeatWrapping;
    texturaMate.repeat.set(1, 2);

    // Pinza
    const texturaPinza = cargadorTexturas.load('texturas/pinza.jpg');
    texturaPinza.wrapS = THREE.RepeatWrapping;
    texturaPinza.wrapT = THREE.RepeatWrapping;

    // Suelo
    const texturaSuelo = cargadorTexturas.load('texturas/suelo.jpg');
    texturaSuelo.wrapS = THREE.RepeatWrapping;
    texturaSuelo.wrapT = THREE.RepeatWrapping;
    texturaSuelo.repeat.set(10, 10);

    // CUBE MAP humus.name
    const texturaMuroPX = cargadorTexturas.load('texturas/cubemap/posx.jpg');
    const texturaMuroNX = cargadorTexturas.load('texturas/cubemap/negx.jpg');
    const texturaMuroPY = cargadorTexturas.load('texturas/cubemap/posy.jpg');
    const texturaMuroNY = cargadorTexturas.load('texturas/cubemap/negy.jpg');
    const texturaMuroPZ = cargadorTexturas.load('texturas/cubemap/posz.jpg');
    const texturaMuroNZ = cargadorTexturas.load('texturas/cubemap/negz.jpg');


    const cargadorCubemap = new THREE.CubeTextureLoader();
    cargadorCubemap.setPath('texturas/cubemap/');
    const mapaEntorno = cargadorCubemap.load([
        'posx.jpg', 'negx.jpg',
        'posy.jpg', 'negy.jpg',
        'posz.jpg', 'negz.jpg'
    ]);


    //MATERIALES
    const materialMetalBrillante = new THREE.MeshPhongMaterial({
        map: texturaMetal, shininess: 110, specular: 0xffffff
    });
    const materialMate = new THREE.MeshLambertMaterial({
        map: texturaMate
    });

    // Rótula -> material Phong + mapa entorno
    const materialRotula = new THREE.MeshPhongMaterial({
        map: texturaMetal,
        envMap: mapaEntorno,
        combine: THREE.MixOperation,
        reflectivity: 0.85,
        shininess: 130,
        specular: 0xffffff
    });
    const materialPinza = new THREE.MeshLambertMaterial({
        map: texturaPinza
    });
    const materialSuelo = new THREE.MeshLambertMaterial({
        map: texturaSuelo
    });
    const materialMuroPX = new THREE.MeshLambertMaterial({ map: texturaMuroPX, side: THREE.BackSide });
    const materialMuroNX = new THREE.MeshLambertMaterial({ map: texturaMuroNX, side: THREE.BackSide });
    const materialMuroPY = new THREE.MeshLambertMaterial({ map: texturaMuroPY, side: THREE.BackSide });
    const materialMuroPZ = new THREE.MeshLambertMaterial({ map: texturaMuroPZ, side: THREE.BackSide });
    const materialMuroNZ = new THREE.MeshLambertMaterial({ map: texturaMuroNZ, side: THREE.BackSide });
    const materialInvisible = new THREE.MeshBasicMaterial({ visible: false });

    // material alammbre
    wireMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

    // Suelo
    const sueloGeom = new THREE.PlaneGeometry(1000, 1000);
    const sueloMat = materialSuelo;
    const suelo = new THREE.Mesh(sueloGeom, sueloMat);
    suelo.rotation.x = - Math.PI / 2;
    suelo.receiveShadow = true; // el suelo recibe la sombra del robot
    scene.add(suelo);

    // ENTORNO
    const habitacionGeom = new THREE.BoxGeometry(900, 500, 900);
    const habitacion = new THREE.Mesh(habitacionGeom, [
        materialMuroPX, // +X pared derecha posx.jpg
        materialMuroNX, // -X pared izquierda negx.jpg
        materialMuroPY, // +Y techo posy.jpg)
        materialInvisible, // -Y suelo negy.jpg
        materialMuroPZ, // +Z pared frontal posz.jpg
        materialMuroNZ // -Z pared detrás negz.jpg
    ]);
    habitacion.position.y = 250; //base en y=0
    habitacion.receiveShadow = true; 
    scene.add(habitacion);

    // Grafo de escena
    robot = new THREE.Object3D();
    scene.add(robot);

    // BASE
    base = new THREE.Object3D();
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 15, 32), materialMetalBrillante);
    baseMesh.position.y = 7.5;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.userData.materialSolido = materialMetalBrillante; 
    base.add(baseMesh);
    robot.add(base);

    // BRAZO
    brazo = new THREE.Object3D();
    brazo.position.y = 15; 
    base.add(brazo);

    const ejeMesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 18, 32), materialMetalBrillante);
    ejeMesh.rotation.z = Math.PI / 2;
    ejeMesh.castShadow = true;
    ejeMesh.receiveShadow = true;
    ejeMesh.userData.materialSolido = materialMetalBrillante;
    brazo.add(ejeMesh);

    const esparragoMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 120, 12), materialMate);
    esparragoMesh.position.y = 60; 
    esparragoMesh.castShadow = true;
    esparragoMesh.receiveShadow = true;
    esparragoMesh.userData.materialSolido = materialMate;
    brazo.add(esparragoMesh);

    // rótula -> material brillante + mapa de entorno
    const rotulaMesh = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 32), materialRotula);
    rotulaMesh.position.y = 120;
    rotulaMesh.castShadow = true;
    rotulaMesh.receiveShadow = true;
    rotulaMesh.userData.materialSolido = materialRotula;
    brazo.add(rotulaMesh);

    // ANTEBRAZO
    // El origen antebrazo -> centro de la rótula y=120
    antebrazo = new THREE.Object3D();
    antebrazo.position.y = 120; 
    brazo.add(antebrazo);

    const discoMesh = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 6, 32), materialMetalBrillante);
    discoMesh.castShadow = true;
    discoMesh.receiveShadow = true;
    discoMesh.userData.materialSolido = materialMetalBrillante;
    antebrazo.add(discoMesh);

    const nervioGeom = new THREE.BoxGeometry(4, 80, 4);
    const posicionesNervios = [
        [10, 40, 10], [-10, 40, 10], [10, 40, -10], [-10, 40, -10]
    ];
    posicionesNervios.forEach(pos => {
        const nervio = new THREE.Mesh(nervioGeom, materialMate);
        nervio.position.set(pos[0], pos[1], pos[2]);
        nervio.castShadow = true;
        nervio.receiveShadow = true;
        nervio.userData.materialSolido = materialMate;
        antebrazo.add(nervio);
    });

    const manoMesh = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 40, 32), materialMetalBrillante);
    manoMesh.rotation.z = Math.PI / 2;
    manoMesh.position.y = 80;
    manoMesh.castShadow = true;
    manoMesh.receiveShadow = true;
    manoMesh.userData.materialSolido = materialMetalBrillante;
    antebrazo.add(manoMesh);

    // PINZAS
    const pinzaGeom = crearGeometriaPinza(); 
    const dedoBaseGeom = new THREE.BoxGeometry(19, 20, 4);

    // muñeca: pivote en el centro de la mano y=80
    // muneca.rotation.z: rotación pinza sobre eje Z de la mano
    // desplazar pinza izq / der en X dentro del pivote: apertura y cierre
    muneca = new THREE.Object3D();
    muneca.position.y = 80;
    antebrazo.add(muneca);

    // Pinza Izquierda
    pinzaIz = new THREE.Object3D();
    pinzaIz.position.set(-12, 0, 10);
    pinzaIz.rotation.x = Math.PI / 2; 
    pinzaIz.rotation.y = Math.PI / 2; 

    const basePinzaIz = new THREE.Mesh(dedoBaseGeom, materialPinza);
    const puntaPinzaIz = new THREE.Mesh(pinzaGeom, materialPinza);
    puntaPinzaIz.position.y = 10; 
    basePinzaIz.castShadow = true;
    basePinzaIz.receiveShadow = true;
    basePinzaIz.userData.materialSolido = materialPinza;
    puntaPinzaIz.castShadow = true;
    puntaPinzaIz.receiveShadow = true;
    puntaPinzaIz.userData.materialSolido = materialPinza;
    
    pinzaIz.add(basePinzaIz);
    pinzaIz.add(puntaPinzaIz);
    muneca.add(pinzaIz);

    // Pinza Derecha
    pinzaDe = pinzaIz.clone();
    pinzaDe.position.set(12, 0, 10);
    muneca.add(pinzaDe);
    
    pinzaDe.traverse(function (objeto) {
        if (objeto.isMesh) {
            objeto.userData.materialSolido = objeto.material;
            objeto.castShadow = true;
            objeto.receiveShadow = true;
        }
    });

    // recorrer robot y guardar mallas
    robot.traverse(function (objeto) {
        if (objeto.isMesh) meshesRobot.push(objeto);
    });

    // aplica aspecto inicial
    cambiarMaterial(params.alambres);
    aplicarParametros();

    //interfaz de usuario
    crearGUI();

    // reloj
    reloj = new THREE.Clock();

    // eventos teclado para mover robot
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    window.addEventListener('resize', onWindowResize, false);
}

function crearGeometriaPinza() {
    const geom = new THREE.BufferGeometry();

    // Coordenadas de los vértices
    // Extremo unido a la mano y=0:  19 (X) x 2 (Z)
    // Extremo de la punta y=38: 4 (X) x 4 (Z)
    // Altura: 38
    const vertices = new Float32Array([
        // Cara frontal (+Z)
        -9.5, 0, 1,    9.5, 0, 1,    2, 38, 2,
        -9.5, 0, 1,    2, 38, 2,    -2, 38, 2,

        // Cara trasera (-Z)
         9.5, 0, -1,  -9.5, 0, -1,  -2, 38, -2,
         9.5, 0, -1,  -2, 38, -2,    2, 38, -2,

        // Cara izq (-X)
        -9.5, 0, -1,  -9.5, 0, 1,   -2, 38, 2,
        -9.5, 0, -1,  -2, 38, 2,    -2, 38, -2,

        // Cara der (+X)
         9.5, 0, 1,    9.5, 0, -1,   2, 38, -2,
         9.5, 0, 1,    2, 38, -2,    2, 38, 2,

        // Tapa arriba (+Y)
        -2, 38, 2,     2, 38, 2,     2, 38, -2,
        -2, 38, 2,     2, 38, -2,   -2, 38, -2,

        // Base (-Y)
        -9.5, 0, -1,   9.5, 0, -1,   9.5, 0, 1,
        -9.5, 0, -1,   9.5, 0, 1,   -9.5, 0, 1
    ]);

    // asignar vértices a la geometría
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    //generar normales
    geom.computeVertexNormals(); 

    return geom;
}

//aplicar trasnformaciones 
function aplicarParametros() {
    base.rotation.y = THREE.MathUtils.degToRad(params.giroBase);
    brazo.rotation.z = THREE.MathUtils.degToRad(params.giroBrazo);
    antebrazo.rotation.y = THREE.MathUtils.degToRad(params.giroAntebrazoY);
    antebrazo.rotation.z = THREE.MathUtils.degToRad(params.giroAntebrazoZ);
    muneca.rotation.z = THREE.MathUtils.degToRad(params.giroPinza);

    const desplazamiento = 2 + params.separacionPinza;
    pinzaIz.position.x = -desplazamiento;
    pinzaDe.position.x = desplazamiento;
}

//cambiar a material alambre
function cambiarMaterial(alambres) {
    meshesRobot.forEach(function (malla) {
        malla.material = alambres ? wireMaterial : malla.userData.materialSolido;
    });
}

//panel GUI
function crearGUI() {
    gui = new lil.GUI();
    const carpetaControls = gui.addFolder('Controls');
    const carpetaRobot = carpetaControls.addFolder('Control Robot');

    carpetaRobot.add(params, 'giroBase', -180, 180, 1)
        .name('Giro Base')
        .onChange(aplicarParametros);

    carpetaRobot.add(params, 'giroBrazo', -45, 45, 1)
        .name('Giro Brazo')
        .onChange(aplicarParametros);

    carpetaRobot.add(params, 'giroAntebrazoY', -180, 180, 1)
        .name('Giro Antebrazo Y')
        .onChange(aplicarParametros);

    carpetaRobot.add(params, 'giroAntebrazoZ', -90, 90, 1)
        .name('Giro Antebrazo Z')
        .onChange(aplicarParametros);

    carpetaRobot.add(params, 'giroPinza', -40, 220, 1)
        .name('Giro Pinza')
        .onChange(aplicarParametros);

    carpetaRobot.add(params, 'separacionPinza', 0, 15, 1)
        .name('Separacion Pinza')
        .onChange(aplicarParametros);

    carpetaRobot.add(params, 'alambres')
        .name('alambres')
        .onChange(cambiarMaterial);

    // Botón de función: arranca la animación.
    carpetaRobot.add({ Anima: animarRobot }, 'Anima');

    carpetaControls.open();
    carpetaRobot.open();
}

//desplazar robot con teclado
function onKeyDown(event) {
    if (event.key in teclas) {
        teclas[event.key] = true;
        event.preventDefault(); // evitar que la página haga scroll con las flechas
    }
}

function onKeyUp(event) {
    if (event.key in teclas) {
        teclas[event.key] = false;
    }
}

function actualizarMovimientoTeclado(delta) {
    const paso = velocidadDesplazamiento * delta;
    if (teclas.ArrowUp) robot.position.z -= paso;
    if (teclas.ArrowDown) robot.position.z += paso;
    if (teclas.ArrowLeft) robot.position.x -= paso;
    if (teclas.ArrowRight) robot.position.x += paso;
}

// Animar
function animarRobot() {
    if (animando) return; // no solapar animaciones si ya hay una en marcha
    animando = true;

    // Guardar estado inicial
    const estadoInicial = Object.assign({}, params);

    function actualizarYRefrescarGUI() {
        aplicarParametros();

        gui.controllersRecursive().forEach(function (controlador) {
            controlador.updateDisplay();
        });
    }

    // Girar base
    const paso1 = new TWEEN.Tween(params)
        .to({ giroBase: 60 }, 1200)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(actualizarYRefrescarGUI);

    // Levantar brazo y antebrazo
    const paso2 = new TWEEN.Tween(params)
        .to({ giroBrazo: 30, giroAntebrazoY: -90 }, 1200)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(actualizarYRefrescarGUI);

    // Flexionar muñeca (antebrazo Z)
    const paso3 = new TWEEN.Tween(params)
        .to({ giroAntebrazoZ: 45 }, 800)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(actualizarYRefrescarGUI);

    // Girar pinza y cerrarla
    const paso4 = new TWEEN.Tween(params)
        .to({ giroPinza: 90, separacionPinza: 0 }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(actualizarYRefrescarGUI);

    // Volver a abrir pinza
    const paso5 = new TWEEN.Tween(params)
        .to({ separacionPinza: 15 }, 600)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(actualizarYRefrescarGUI);

    // Recuperar estado inicial
    const pasoFinal = new TWEEN.Tween(params)
        .to(estadoInicial, 1500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(actualizarYRefrescarGUI)
        .onComplete(function () {
            animando = false;
        });

    // Encadenar pasos
    paso1.chain(paso2);
    paso2.chain(paso3);
    paso3.chain(paso4);
    paso4.chain(paso5);
    paso5.chain(pasoFinal);

    paso1.start();
}

function onWindowResize() {
    // actualizar cámara general y tamaño del renderer
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    // avanzar animaciones
    TWEEN.update();

    // aplicar movimiento robot
    const delta = reloj.getDelta();
    actualizarMovimientoTeclado(delta);

    renderer.autoClear = false;

    // Vista general
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0xeeeeee));
    renderer.clear();
    renderer.render(scene, camera);

    // Vista miniatura cenital
    const ladoMiniatura = Math.min(window.innerWidth, window.innerHeight) / 4;
    const x = 0;
    // Arriba a la izq
    const y = window.innerHeight - ladoMiniatura;

    renderer.setViewport(x, y, ladoMiniatura, ladoMiniatura);
    renderer.setScissor(x, y, ladoMiniatura, ladoMiniatura);
    renderer.setScissorTest(true);
    renderer.setClearColor(new THREE.Color(0xd7d7f5));
    renderer.clear();
    renderer.render(scene, cameraTop);
    renderer.setScissorTest(false);
}