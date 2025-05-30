import './style.css'
import * as THREE from 'three'
// __controls_import__
// __gui_import__

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Pane } from 'tweakpane'

import trailFragment from './shaders/trail/fragment.glsl'
import trailVertex from './shaders/trail/vertex.glsl'

/**
 * Debug
 */
// __gui__
const config = {
	example: 5,
}
const pane = new Pane()

/**
 * Scene
 */
const scene = new THREE.Scene()
// scene.background = new THREE.Color(0xdedede)

/**
 * render sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}

/**
 * Camera
 */
const fov = 60
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1)
camera.position.set(4, 4, 4)
camera.lookAt(new THREE.Vector3(0, 2.5, 0))

/**
 * Show the axes of coordinates system
 */
// __helper_axes__
// const axesHelper = new THREE.AxesHelper(3)
// scene.add(axesHelper)

/**
 * renderer
 */
const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
})
document.body.appendChild(renderer.domElement)

/**
 * OrbitControls
 */
// __controls__
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const bgGeometry = new THREE.BufferGeometry()
bgGeometry.setAttribute(
	'position',
	new THREE.BufferAttribute(
		new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
		3
	)
)
bgGeometry.setAttribute(
	'uv',
	new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
)
const bgMaterial = new THREE.ShaderMaterial({
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		}
	`,
	fragmentShader: /* glsl */ `
		uniform sampler2D uTrailMap;
		varying vec2 vUv;
		
		void main() {

			vec3 color = texture2D(uTrailMap, vUv).rgb;
			gl_FragColor = vec4(color, 1.0);
		}
	`,
	uniforms: {
		uTrailMap: new THREE.Uniform(),
	},
	depthWrite: false,
})
const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial)
bgMesh.renderOrder = -1
scene.add(bgMesh)

function createRenderTarget() {
	return new THREE.WebGLRenderTarget(sizes.width * 0.25, sizes.height * 0.25, {
		type: THREE.HalfFloatType,
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		depthBuffer: false,
	})
}

let rt1 = createRenderTarget()
let rt2 = createRenderTarget()

let inputRT = rt1
let outputRT = rt2

const trailMaterial = new THREE.ShaderMaterial({
	vertexShader: trailVertex,
	fragmentShader: trailFragment,
	uniforms: {
		uResolution: new THREE.Uniform(
			new THREE.Vector2(sizes.width * 0.25, sizes.height * 0.25)
		),
		uMap: new THREE.Uniform(),
		uPointer: new THREE.Uniform(new THREE.Vector2(0, 0)),
		uDt: new THREE.Uniform(0.0),
		uSpeed: new THREE.Uniform(0),
		uTime: new THREE.Uniform(0),
	},
})
const trailMesh = new THREE.Mesh(bgGeometry, trailMaterial)
const sceneTrail = new THREE.Scene()
sceneTrail.add(trailMesh)

const pointer = new THREE.Vector2()
window.addEventListener('pointermove', (ev) => {
	pointer.x = (ev.clientX / sizes.width) * 2 - 1
	pointer.y = -(ev.clientY / sizes.height) * 2 + 1
})

/**
 * Three js Clock
 */
// __clock__
const clock = new THREE.Clock()
let time = 0

handleResize()

/**
 * frame loop
 */
function tic() {
	/**
	 * tempo trascorso dal frame precedente
	 */
	const dt = clock.getDelta()
	time += dt
	/**
	 * tempo totale trascorso dall'inizio
	 */
	// const time = clock.getElapsedTime()

	// __controls_update__
	controls.update()

	trailMaterial.uniforms.uTime.value = time
	const prevPointer = trailMaterial.uniforms.uPointer.value

	trailMaterial.uniforms.uSpeed.value = THREE.MathUtils.lerp(
		trailMaterial.uniforms.uSpeed.value,
		Math.sqrt(
			(pointer.x - prevPointer.x) ** 2 + (pointer.y - prevPointer.y) ** 2
		),
		dt * 3
	)

	trailMaterial.uniforms.uPointer.value.lerp(pointer, dt * 15)
	trailMaterial.uniforms.uDt.value = dt

	renderer.setRenderTarget(outputRT)
	renderer.render(sceneTrail, camera)

	renderer.setRenderTarget(null)

	bgMaterial.uniforms.uTrailMap.value = outputRT.texture
	trailMaterial.uniforms.uMap.value = outputRT.texture

	renderer.render(scene, camera)

	const temp = inputRT
	inputRT = outputRT
	outputRT = temp

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

window.addEventListener('resize', handleResize)

function handleResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height

	// camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix()
	trailMaterial.uniforms.uResolution.value.set(
		sizes.width * 0.25,
		sizes.height * 0.25
	)

	renderer.setSize(sizes.width, sizes.height)
	rt1.setSize(sizes.width * 0.25, sizes.height * 0.25)
	rt2.setSize(sizes.width * 0.25, sizes.height * 0.25)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}
