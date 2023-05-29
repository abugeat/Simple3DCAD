
import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as THREE from 'three';
import {
	acceleratedRaycast, computeBoundsTree, disposeBoundsTree,
	SAH,
} from 'three-mesh-bvh';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// Global variables
let renderer, scene, camera, controls, transformControl;
let mesh, geometry, containerObj;
let selectedObject = null;
geometry = null;


let material = new THREE.MeshPhongMaterial( { color: 0x999999 , side: THREE.DoubleSide} );
let materialSelected = new THREE.MeshPhongMaterial( { color: '#00b16a' , side: THREE.DoubleSide} );
let materialHover = new THREE.MeshPhongMaterial( { color: '#ff6347' , side: THREE.DoubleSide} );
// geometry = new THREE.BufferGeometry();
// geometry = new THREE.SphereGeometry(1);

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;

// const materialhit = new THREE.MeshBasicMaterial(
//     { color: 0xff6347, transparent: true, opacity:0.5 }
// );
// const materialrays = new THREE.MeshBasicMaterial(
//     { color: 0xff6347, transparent: true, opacity:0.5 }
// );

const params = {
	"addCube": () => addCube(),
	"translate": () => {
		transformControl.setMode( 'translate' );
		renderer.render( scene, camera );
	},
	"rotate": () => {
		transformControl.setMode( 'rotate' );
		renderer.render( scene, camera );
	},
	"scale": () => {
		transformControl.setMode( 'scale' );
		renderer.render( scene, camera );
	},
};




init();

addCube();
addCube();
addCube();

function init() {

	// renderer setup
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x000000, 1 );
	document.body.appendChild( renderer.domElement );

	// scene setup
	scene = new THREE.Scene();

    // axes helper
    const axesHelper = new THREE.AxesHelper(1); // 100 est la taille des axes
    scene.add(axesHelper);

    // ambient light
	const light = new THREE.DirectionalLight( 0xffffff, 1.0 );
	light.position.set( 1, 2, 1 );
	scene.add( light );
	const light2 = new THREE.DirectionalLight( 0xffffff, 0.75 );
	light2.position.set( -1, 0.5, -1 );
	scene.add( light2 );
	// scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );
	scene.background = new THREE.Color( "#2e3331" );


	// geometry setup
	containerObj = new THREE.Object3D();
	scene.add( containerObj );

	// camera setup
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	// camera.position.set(0, 10, 10) ;
	camera.far = 100000;
	camera.updateProjectionMatrix();
    camera.position.set( 1, 2, 3);

	// control setup
	controls = new OrbitControls( camera, renderer.domElement );
	// controls.target.set( 25, 0, -25 );
	controls.target.set(0, 0, 0);
	controls.update();
	controls.addEventListener('change', function(){
		renderer.render( scene, camera );
	});

	// TransformControl setup
	transformControl = new TransformControls(camera, renderer.domElement);
	transformControl.setMode('rotate'); // 'translate', 'rotate' or 'scale'
	transformControl.addEventListener( 'dragging-changed', function ( event ) {
		controls.enabled = ! event.value;
	} );

	scene.add(transformControl);

    // lil-gui setup
    const gui = new dat.GUI();
    gui.title("Simple3DCAD");
	gui.add( params, 'addCube' ).name( 'Add cube' );
	gui.add( params, 'translate' ).name( 'Translate' );
	gui.add( params, 'rotate' ).name( 'Rotate' );
	gui.add( params, 'scale' ).name( 'Scale' );
    
    // resize eventlistener
	window.addEventListener( 'resize', function () {
				
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	
		renderer.setSize( window.innerWidth, window.innerHeight );
	
		renderer.render( scene, camera );
	
	}, false );

    document.addEventListener( 'pointermove', onPointerMove );
	document.addEventListener( 'dblclick', onMouseDown );
}

function addCube() {
	let randomSize = [
		Math.random() * 0.5 + 0.1, 
		Math.random() * 0.5 + 0.1, 
		Math.random() * 0.5 + 0.1
	];
	let randomPosition = [
		Math.random() * 1, 
		Math.random() * 1, 
		Math.random() * 1
	];

	let geometry_cube = new THREE.BoxGeometry(
		randomSize[0],
		randomSize[1],
		randomSize[2]
	);
    let mesh_cube = new THREE.Mesh( geometry_cube, material );
    mesh_cube.position.set(
		randomPosition[0],
		randomPosition[1],
		randomPosition[2]
	);

	containerObj.add( mesh_cube );

	// // add the control
	// let transformcontrol = new TransformControls( camera, renderer.domElement );
	// transformcontrol.addEventListener( 'change', function(){
	// 	renderer.render( scene, camera )
	// }) ;
	// scene.add(transformcontrol);
	// transformcontrol.attach( mesh_cube );
	// transformcontrol.setMode( 'translate' ); // 'translate', 'rotate' or 'scale'
	// transformcontrol.addEventListener( 'dragging-changed', function ( event ) {
	// 	controls.enabled = ! event.value;
	// } );

	transformControl.attach( mesh_cube );


	mesh_cube.addEventListener( 'click', function () {
		transformcontrol.visible = !transformcontrol.visible;
	} );
	

	if (geometry == null) {
    	geometry = geometry_cube;
	} else {
		geometry = BufferGeometryUtils.mergeGeometries([geometry, geometry_cube]);
	}

    renderer.render( scene, camera );

    letcomputeBoundsTree();
}

function letcomputeBoundsTree() {
	console.time( 'computing bounds tree' );
	geometry.computeBoundsTree( {
		// maxLeafTris: 5,
		strategy: parseFloat( SAH ),
	});
	geometry.boundsTree.splitStrategy = SAH;
	console.timeEnd( 'computing bounds tree' );
}

function onPointerMove( event ) {

    if ( selectedObject ) {

        selectedObject.material= material;

    }

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( pointer, camera );

    // const intersects = raycaster.intersectObject( containerObj, true );
    const intersects = raycaster.intersectObject( scene.children[3], true );
	
    if ( intersects.length > 0 ) {

        const res = intersects.filter( function ( res ) {
            return res && res.object;
        })[0];

        if ( res && res.object) {
            selectedObject = res.object;
            selectedObject.material = materialHover;
			// transformControl.attach( selectedObject );
        }

    }

    renderer.render( scene, camera );

}

function onMouseDown(event) {
	// isMouseDown = true;

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( pointer, camera );

    // const intersects = raycaster.intersectObject( containerObj, true );
    const intersects = raycaster.intersectObject( scene.children[3], true );

    if ( intersects.length > 0 ) {

        const res = intersects.filter( function ( res ) {
            return res && res.object;
        })[0];

        if ( res && res.object) {
            selectedObject = res.object;
            selectedObject.material = materialSelected;
			transformControl.attach( selectedObject );
        }

    }

    renderer.render( scene, camera );
  }
