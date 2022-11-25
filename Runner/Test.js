// 1. Enable shadow mapping in the renderer. 
// 2. Enable shadows and set shadow parameters for the lights that cast shadows. 
// Both the THREE.DirectionalLight type and the THREE.SpotLight type support shadows. 
// 3. Indicate which geometry objects cast and receive shadows.

"use strict";

import * as THREE from '../libs/three.js/three.module.js'
import { OrbitControls } from '../libs/three.js/controls/OrbitControls.js';
import { GUI } from "../../libs/three.js/libs/dat.gui.module.js"
import { OBJLoader } from '../libs/three.js/loaders/OBJLoader.js';
import { MTLLoader } from '../libs/three.js/loaders/MTLLoader.js';
import { FBXLoader } from '../../libs/three.js/loaders/FBXLoader.js';

let renderer = null, scene = null, camera = null, group = null, objects = [], orbitControls = null, uniforms = null, pepsiman = null;
//let objBoxUrl ={obj:'../Modelos/Environment/Box/6fcc.obj',mtl:'../Modelos/Environment/Box/6fcc.mtl'};
let objSodaUrl ={obj:'../Modelos/Items/SodaCan/obj0.obj',mtl:'../Modelos/Items/SodaCan/mtl0.mtl'};
let objBoxUrl ={obj:'../Modelos/Environment/Box/6fcc.obj',mtl:'../Modelos/Environment/Box/6fcc.mtl'};
let objFriesUrl ={obj:'../Modelos/Items/FrenchFries/7018.obj',mtl:'../Modelos/Items/FrenchFries/7018.mtl'};

//Acciones de pepsiman
let acciones_pepsiman = {};
let animation = "idle";

let duration = 20000; // ms
let currentTime = Date.now();

let directionalLight = null, spotLight = null, ambientLight = null;

//Imagen de paredes y piso
let mapUrl = "../images/blue.jpg";

let SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

let settings;

function main() {
    const canvas = document.getElementById("webglcanvas");

    createScene(canvas);

  
    createPanel();

    resize(); 
    update();
}

function onError ( err ){ console.error( err ); };

function onProgress( xhr ) 
{
    if ( xhr.lengthComputable ) {

        const percentComplete = xhr.loaded / xhr.total * 100;
        console.log( xhr.target.responseURL, Math.round( percentComplete, 2 ) + '% downloaded' );
    }
}

//Funcion para animaciones pepsiman
function changeAnimation(animationText)
{
    acciones_pepsiman[animation].stop();
    acciones_pepsiman[animation].reset();
    animation = animationText;
    acciones_pepsiman[animation].play();
}

function resize()
{
    const canvas = document.getElementById("webglcanvas");
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.width, canvas.height);
}

//Funcion para crear panel de movimientos
function createPanel()
{
    const panel = new GUI({width:400});
    const folder = panel.addFolder('Animations');
    settings = {
        'correr': changeAnimation.bind(this, 'idle'),
        'saltar': changeAnimation.bind(this, 'run')
    };
    Object.keys(settings).forEach((key)=> folder.add(settings, key));
    folder.open();
}

function setVectorValue(vector, configuration, property, initialValues)
{
    if(configuration !== undefined)
    {
        if(property in configuration)
        {
            console.log("setting:", property, "with", configuration[property]);
            vector.set(configuration[property].x, configuration[property].y, configuration[property].z);
            return;
        }
    }
    console.log("setting:", property, "with", initialValues);
    vector.set(initialValues.x, initialValues.y, initialValues.z);
}

//Funcion para cargar objetos con animaciones FBX
async function loadFBX(fbxModelUrls, configuration)
{
    try{
        let pepsimanes = []
        const animations = ['idle', 'run']
        let currentAnimation = 0

        for(const fbxModelUrl of fbxModelUrls)
        {
            let object = await new FBXLoader().loadAsync(fbxModelUrl);

            setVectorValue(object.position, configuration, 'position', new THREE.Vector3(0,0,0));
            setVectorValue(object.scale, configuration, 'scale', new THREE.Vector3(1, 1, 1));
            setVectorValue(object.rotation, configuration, 'rotation', new THREE.Vector3(0,0,0));
            
            console.log("FBX object", object)
            object.animations[0].name = animations[currentAnimation++]
            pepsimanes.push(object)
        }

        scene.add(pepsimanes[0])
        pepsiman = pepsimanes[0]
        pepsimanes.forEach(element => 
        {
            console.log('robot', element)
            element.animations.forEach(animation =>{
                acciones_pepsiman[animation.name] = new THREE.AnimationMixer( scene ).clipAction(animation, pepsiman);
            })
        });

        acciones_pepsiman['idle'].play();
        console.log(pepsimanes)
    }
    catch(err)
    {
        console.error( err );
    }
}

async function loadObjMtl(objModelUrl, objects)
{
    try
    {
        const mtlLoader = new MTLLoader();

        const materials = await mtlLoader.loadAsync(objModelUrl.mtl, onProgress, onError);

        materials.preload();
        
        const objLoader = new OBJLoader();

        objLoader.setMaterials(materials);

        const object = await objLoader.loadAsync(objModelUrl.obj, onProgress, onError);
    
        object.traverse(function (child) {
            if (child.isMesh)
            {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        console.log(object);

        object.scale.set(0.05, 0.05, 0.05);
        object.position.y += -5;

        objects.push(object);
        scene.add(object);
    }
    catch (err)
    {
        onError(err);
    }
}


function animate()
{
    const now = Date.now();
    const deltat = now - currentTime;
    currentTime = now;
    let fract = deltat / duration;
    uniforms.time.value += fract;
    if(pepsiman && acciones_pepsiman[animation])
    {
        acciones_pepsiman[animation].getMixer().update(deltat * 0.001);
    }

    for(const object of objects)
    {
        object.position.z -= 0.1 * deltat;
        

        if(object.position.z < -100){
            object.position.z = 100;    
            object.position.x = -10-Math.random()*-51;
        }

        if(object.mixer)
            object.mixer.update(deltat*0.000001);
           
            console.log(object.position);
    }
}

function update() {
    requestAnimationFrame(function () { update(); });
    //Renderea la escena
    renderer.render(scene, camera);
    orbitControls.update();
    animate();
}

function createScene(canvas) {
    //Crea un renderer de Three.js y lo adjunta al canvas
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });

    //Ajusta el tamaño de vision
    renderer.setSize(canvas.width, canvas.height);

    //Activa las sombras
    renderer.shadowMap.enabled = true;

    //Hay tres opciones: THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFShadowMap;

    //Crea una nueva escena de Three.js
    scene = new THREE.Scene();

    //Añade una camara para poder ver la escena
    camera = new THREE.PerspectiveCamera(90, canvas.width / canvas.height, 1, 4000);
    camera.position.set(0, 6, -116);

    //Añade Orbit Controller para poder hacer pruebas y mover la camara
    orbitControls = new OrbitControls(camera, renderer.domElement);

    //Añade luz direccional a los objetos
    directionalLight = new THREE.DirectionalLight(0xaaaaaa, 1);

    //Crea y añade la iluminacion
    directionalLight.position.set(.5, 1, -3);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    spotLight = new THREE.SpotLight(0xaaaaaa);
    spotLight.position.set(0, 100, 15);
    spotLight.target.position.set(2, 0, -2);
    scene.add(spotLight);
    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    ambientLight = new THREE.AmbientLight(0x444444, 1);
    scene.add(ambientLight);

    //Crea un Listener de audiop y lo agrega a la camara
    const listener = new THREE.AudioListener();
    camera.add( listener );

    //Crea una fuente de audio global
    const sound = new THREE.Audio( listener );

    //Carga el sonido y lo añade al buffer de objetos de audio 
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load( '../Audio/pepsiman.mp3', function( buffer ) {
        sound.setBuffer( buffer );
        sound.setLoop( true );
        sound.setVolume( 0.5 );
        sound.play();
    });

    //Crea un grupo para añadir los objetos 3D
    group = new THREE.Object3D;
    scene.add(group); 

    //Ruta para añadir objetos FBX de pepsiman a arreglo de animaciones
    const baseUrl = '../Modelos/'
    const pepsimanUrls = [baseUrl+'Slow Run.fbx', baseUrl+'Jumping.fbx']
    loadFBX(pepsimanUrls, {position: new THREE.Vector3(0, -3.5, -105), scale:new THREE.Vector3(0.03, 0.03, 0.03) })

    //
    loadObjMtl(objBoxUrl, objects);
    loadObjMtl(objSodaUrl, objects);
    loadObjMtl(objFriesUrl, objects);


    //Texturas para deformar imagen de fondo
    const COLORMAP = new THREE.TextureLoader().load("../images/blue.jpg");
    const NOISEMAP = new THREE.TextureLoader().load("../../images/cloud.png");

    //Uniformes para shader material
    uniforms = 
    {
        time: { type: "f", value: 0.8 },
        noiseTexture: { type: "t", value: NOISEMAP },
        glowTexture: { type: "t", value: COLORMAP }
    };

    //Envuelve la textura en el mesh para su movimiento
    uniforms.noiseTexture.value.wrapS = uniforms.noiseTexture.value.wrapT = THREE.RepeatWrapping;
    uniforms.glowTexture.value.wrapS = uniforms.glowTexture.value.wrapT = THREE.RepeatWrapping;

    //Carga la definicion de los shaders del HTML para paredes laterales y piso
    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
        
        transparent: true,
    } );

    //Carga la definicion de los shaders del HTML para pared de fondo
    const material2 = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader2' ).textContent,
        
        transparent: true,
    } );

    //Crea un mapa de texturas
    const map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    //Piso
    let geometry = new THREE.PlaneGeometry(80, 150, 20, 20);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;
    mesh.position.z = -70;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);

    //Pared de fondo
    let geometry2 = new THREE.PlaneGeometry(80, 120, 50, 50);
    let mesh2 = new THREE.Mesh(geometry2, material2);
    mesh2.rotation.z = Math.PI /1;
    mesh2.position.z = Math.PI /180;
    mesh2.position.y = 56;
    mesh2.rotation.y -= Math.PI / 1;
    mesh2.castShadow = false;
    mesh2.receiveShadow = true;
    group.add(mesh2);

    //Pared izquierda
    let geometry3 = new THREE.PlaneGeometry(120, 150, 50, 50);
    let mesh3 = new THREE.Mesh(geometry3, material);
    mesh3.position.x = 30;
    mesh3.position.y = 56;
    mesh3.position.z = -70;
    mesh3.rotation.y -= Math.PI / 2;
    mesh3.rotation.z = Math.PI / 2;
    mesh3.castShadow = false;
    mesh3.receiveShadow = true;
    group.add(mesh3);

    //Pared derecha
    let geometry4 = new THREE.PlaneGeometry(120, 150, 50, 50);
    let mesh4 = new THREE.Mesh(geometry4, material);
    mesh4.position.x = -30;
    mesh4.position.y = 56;
    mesh4.position.z = -70;
    mesh4.rotation.z -= Math.PI / 2;
    mesh4.rotation.y = Math.PI / 2;
    mesh4.castShadow = false;
    mesh4.receiveShadow = true;
    group.add(mesh4);
}

main();
