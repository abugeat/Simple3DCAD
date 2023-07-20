// TODO: most of the time, the 3D model is accessed with scene.children[3].
// 	 It would be better to do it differently. Maybe with a global variable or its uuid.

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
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// Global variables
let renderer, scene, camera, controls, transformControl;
let mesh, geometry, containerObj;
let selectedObject = null;
let hoveredObject = null;
geometry = null;

let gui;

let material = new THREE.MeshPhongMaterial( { color: 0x999999 , side: THREE.DoubleSide} );
let materialSelected = new THREE.MeshPhongMaterial( { color: '#00b16a' , side: THREE.DoubleSide} );
let materialHover = new THREE.MeshPhongMaterial( { color: '#65a88d' , side: THREE.DoubleSide} );
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

let params = {
	"addCube": () => addCube(),
	"removeCube": () => removeCube(),
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
	"transformControlAxis": "local",
	"saveModelInOBJ": () => saveModelInOBJ(),
};
let controller_transformControlAxis;




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
    camera.position.set( 10, 20, 30);

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
	transformControl.setSpace('local'); // 'local' or 'world' (move object on axis or on plane)
	transformControl.setMode('rotate'); // 'translate', 'rotate' or 'scale'
	transformControl.addEventListener( 'dragging-changed', function ( event ) {
		controls.enabled = ! event.value;
	} );

	scene.add(transformControl);

    // lil-gui setup
    gui = new dat.GUI();
    gui.title("Simple3DCAD");
	gui.add( params, 'addCube' ).name( '🔲 Add cube [C]' );
	gui.add( params, 'removeCube' ).name( '❌ Remove cube [del]' );
	gui.add( params, 'translate' ).name( 'Translate [T]' );
	gui.add( params, 'rotate' ).name( 'Rotate [R]' );
	gui.add( params, 'scale' ).name( 'Scale [S]' );
	controller_transformControlAxis = gui.add( params, 'transformControlAxis', {"Local": 'local', "Global": 'global'})
		.name( 'Controller axis' )
		.onChange( function ( value ) {
			transformControl.setSpace( value );
		});
	gui.add( params, 'saveModelInOBJ' ).name( '💾 Save model in OBJ' );

    
    // resize eventlistener
	window.addEventListener( 'resize', function () {
				
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	
		renderer.setSize( window.innerWidth, window.innerHeight );
	
		renderer.render( scene, camera );
	
	}, false );

    document.addEventListener( 'pointermove', onPointerMove );
	document.addEventListener( 'dblclick', onDblClickDown );
}

function removeCube() {
	// remove the selected object
	if ( selectedObject ) {
		containerObj.remove( selectedObject );
		selectedObject = null;
		transformControl.detach();
		renderer.render( scene, camera );
	}

}

function addCube() {
	let randomSize = [
		Math.random() * 10.0 + 1.0, 
		Math.random() * 10.0 + 1.0, 
		Math.random() * 10.0 + 1.0
	];
	let randomPosition = [
		(Math.random()-Math.random()) * 20, 
		Math.random() * 5,
		(Math.random()-Math.random()) * 20, 
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


	// mesh_cube.addEventListener( 'click', function () {
	// 	transformControl.visible = !transformControl.visible;
	// } );
	

	if (geometry == null) {
    	geometry = geometry_cube;
	} else {
		geometry = BufferGeometryUtils.mergeGeometries([geometry, geometry_cube]);
	}


	changeSelected(mesh_cube);


    renderer.render( scene, camera );

    letcomputeBoundsTree();
}

function changeSelected(selected) {
	// change material of previous selected object
	if ( selectedObject ) {
		selectedObject.material = material;
	}

	// change material of new selected object
	if ( selected ) {
		selectedObject = selected;
		selectedObject.material = materialSelected;
		transformControl.attach( selectedObject );
	} else {
		selectedObject = null;
		transformControl.detach();
	}


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

    if ( hoveredObject && hoveredObject != selectedObject) {

        hoveredObject.material= material;

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

        if ( res && res.object && res.object != selectedObject) {
            hoveredObject = res.object;
            hoveredObject.material = materialHover;
			// transformControl.attach( selectedObject );
        }

    }

    renderer.render( scene, camera );

}

function onDblClickDown(event) {
	// isMouseDown = true;

	if ( selectedObject ) {
		changeSelected(null);
		// selectedObject.material = material;

		// selectedObject = null;

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
            changeSelected(res.object);
        }

    }

    renderer.render( scene, camera );
}


// on "k" key pressed
document.addEventListener('keydown', function(event) {
	
	// add cube
	if(event.key == "c") {
		addCube();
	}

	// translate
	if(event.key == "t") {
		params.translate();
	}

	// rotate
	if(event.key == "r") {
		params.rotate();
	}

	// scale
	if(event.key == "s") {
		params.scale();
	}

	// remove cube (delete)
	if(event.key == "Delete") {
		removeCube();
	}

});

function saveModelInOBJ() {
	// Instantiate an exporter
	const exporter = new OBJExporter();

	// Parse the input and generate the OBJ output
	const data = exporter.parse( scene.children[3] );
	console.log(scene);
	
	// download the file
	const blob = new Blob([data], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'model.obj';
	link.click();
	URL.revokeObjectURL(url);
}