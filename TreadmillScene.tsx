"use client"

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

// fitAspect is the narrowest aspect ratio that view frames the whole treadmill at;
// on anything narrower the camera backs away to keep it in frame.
const WIDE_VIEW = { position: new THREE.Vector3(3.3, 2.7, 3.6), fitAspect: 1.25 }
const TALL_VIEW = { position: new THREE.Vector3(0.9, 3.4, 3.8), fitAspect: 0.85 }
// Slightly off the treadmill's center to balance out the perspective of the near end.
const LOOK_AT = new THREE.Vector3(-0.21, -0.05, -0.03)

// Ordered from empty to dense: brighter surfaces get heavier glyphs.
const GLYPHS = " .:-=+*#%@"

const asciiVertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const asciiFragmentShader = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uGlyphs;
  uniform vec2 uCell;
  uniform vec2 uGrid;
  uniform float uGlyphCount;

  void main() {
    vec2 position = gl_FragCoord.xy / uCell;
    vec2 cell = floor(position);

    // The scene target is linear, so convert it to display values first.
    vec3 color = pow(texture2D(uScene, (cell + 0.5) / uGrid).rgb, vec3(1.0 / 2.2));
    float peak = max(color.r, max(color.g, color.b));

    // Weight toward the strongest channel so saturated colors like red aren't left with sparse glyphs.
    float density = mix(dot(color, vec3(0.299, 0.587, 0.114)), peak, 0.6);
    float glyph = floor(min(density, 0.999) * uGlyphCount);
    float mask = texture2D(uGlyphs, vec2((glyph + fract(position.x)) / uGlyphCount, fract(position.y))).r;

    // Keep colors vivid even on dim surfaces, while greys stay dim so the sushi stand out.
    float saturation = (peak - min(color.r, min(color.g, color.b))) / max(peak, 0.001);
    vec3 ink = mix(color, color / max(peak, 0.001), saturation);

    gl_FragColor = vec4(ink * mask, mask);
  }
`

export default function TreadmillScene() {
  return (
    <div className="fixed inset-0">
      <h1 className="sr-only">Sushi Run Club</h1>
      <Canvas camera={{ fov: 35 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[-1, 5, 3]} intensity={2.6} />
        <FramedCamera />
        <WalkingTreadmill />
        <AsciiRenderer />
      </Canvas>
    </div>
  )
}

function FramedCamera() {
  const camera = useThree((state) => state.camera)
  const aspect = useThree((state) => state.viewport.aspect)

  useEffect(() => {
    const { position, fitAspect } = aspect < 1 ? TALL_VIEW : WIDE_VIEW
    camera.position.copy(position).multiplyScalar(Math.max(1, fitAspect / aspect))
    camera.lookAt(LOOK_AT)
  }, [camera, aspect])

  return null
}

// Takes over R3F's render loop: draws the scene into a low-resolution target, then
// paints one colored glyph per character cell from it.
function AsciiRenderer() {
  const { width, height } = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)

  const target = useMemo(() => new THREE.WebGLRenderTarget(1, 1), [])
  const screen = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: asciiVertexShader,
      fragmentShader: asciiFragmentShader,
      uniforms: {
        uScene: { value: target.texture },
        uGlyphs: { value: null },
        uCell: { value: new THREE.Vector2() },
        uGrid: { value: new THREE.Vector2() },
        uGlyphCount: { value: GLYPHS.length },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false

    const scene = new THREE.Scene()
    scene.add(quad)
    return { scene, camera: new THREE.Camera(), uniforms: material.uniforms }
  }, [target])

  useEffect(() => {
    // Smaller cells on small screens so the sushi keep enough characters to read.
    const cssCellWidth = THREE.MathUtils.clamp(Math.round(Math.min(width, height) / 110), 5, 9)
    const cellWidth = Math.round(cssCellWidth * dpr)
    const cellHeight = Math.round(cssCellWidth * 1.8 * dpr)
    const columns = (width * dpr) / cellWidth
    const rows = (height * dpr) / cellHeight

    const glyphs = createGlyphAtlas(cellWidth, cellHeight)
    screen.uniforms.uGlyphs.value = glyphs
    screen.uniforms.uCell.value.set(cellWidth, cellHeight)
    screen.uniforms.uGrid.value.set(columns, rows)
    // Twice the grid resolution, so each linear sample averages the cell and thin parts don't flicker.
    target.setSize(Math.ceil(columns) * 2, Math.ceil(rows) * 2)

    return () => glyphs.dispose()
  }, [width, height, dpr, screen, target])

  useEffect(() => () => target.dispose(), [target])

  useFrame(({ gl, scene, camera }) => {
    gl.setRenderTarget(target)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.render(screen.scene, screen.camera)
  }, 1)

  return null
}

function createGlyphAtlas(cellWidth: number, cellHeight: number) {
  const canvas = document.createElement("canvas")
  canvas.width = cellWidth * GLYPHS.length
  canvas.height = cellHeight

  const context = canvas.getContext("2d")!
  context.fillStyle = "#000"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = "#fff"
  context.font = `bold ${Math.round(cellHeight * 0.9)}px ui-monospace, Menlo, Consolas, monospace`
  context.textAlign = "center"
  context.textBaseline = "middle"
  Array.from(GLYPHS).forEach((glyph, index) => {
    context.fillText(glyph, (index + 0.5) * cellWidth, cellHeight / 2)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

type Radii = [number, number, number]

const SUSHI_SCALE = 1.2
const STRIDE_RATE = 10
const TOPPING_Y = 0.22
const TOPPING_RADII: Radii = [0.5, 0.14, 0.32]
const STRIPE_RADII: Radii = [0.507, 0.142, 0.325]
const NORI_RADII: Radii = [0.52, 0.4, 0.34]

type NigiriProps = {
  position: [number, number, number]
  phase: number
  toppingColor: string
  stripeColor?: string
  noriBand?: boolean
}

function Nigiri({ position, phase, toppingColor, stripeColor, noriBand = false }: NigiriProps) {
  const sushiRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const sushi = sushiRef.current
    if (!sushi) return

    const stride = phase + clock.elapsedTime * STRIDE_RATE
    sushi.position.y = position[1] + Math.abs(Math.sin(stride)) * 0.2
    sushi.rotation.z = Math.sin(stride) * 0.12
    sushi.rotation.x = Math.cos(stride) * 0.12
  })

  return (
    <group ref={sushiRef} position={position} scale={SUSHI_SCALE}>
      {/* Rice */}
      <mesh scale={[0.42, 0.26, 0.28]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color="#f8f8f0" />
      </mesh>

      {/* Topping */}
      <mesh position={[0, TOPPING_Y, 0]} scale={TOPPING_RADII}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={toppingColor} />
      </mesh>

      {/* Topping texture */}
      {stripeColor &&
        [-0.24, 0, 0.24].map((x) => (
          <Strip key={x} y={TOPPING_Y} radii={STRIPE_RADII} x={x} halfWidth={0.045} color={stripeColor} />
        ))}

      {noriBand && <Strip y={0.05} radii={NORI_RADII} x={0} halfWidth={0.12} color="#223322" />}
    </group>
  )
}

// A slice across an ellipsoid at a given x, so it wraps the curved surface like a strip.
function Strip({
  y,
  radii: [radiusX, radiusY, radiusZ],
  x,
  halfWidth,
  color,
}: {
  y: number
  radii: Radii
  x: number
  halfWidth: number
  color: string
}) {
  const thetaStart = Math.acos((x + halfWidth) / radiusX)
  const thetaLength = Math.acos((x - halfWidth) / radiusX) - thetaStart

  return (
    <mesh position={[0, y, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[radiusY, radiusX, radiusZ]}>
      <sphereGeometry args={[1, 32, 6, 0, Math.PI * 2, thetaStart, thetaLength]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

const BELT_LENGTH = 3.8
const TREAD_BARS = 14
const BELT_SPEED = 1

function WalkingTreadmill() {
  const beltRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    beltRef.current?.children.forEach((bar, index) => {
      const travelled = (index / TREAD_BARS) * BELT_LENGTH + clock.elapsedTime * BELT_SPEED
      bar.position.z = (travelled % BELT_LENGTH) - BELT_LENGTH / 2
    })
  })

  return (
    <group scale={0.8}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.0, 0.1, 4.0]} />
        <meshStandardMaterial color="#8a8f98" />
      </mesh>

      {/* Bottom Trim */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2.1, 0.02, 4.1]} />
        <meshStandardMaterial color="#6b7078" />
      </mesh>

      {/* Running Belt */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.8, 0.03, 3.8]} />
        <meshStandardMaterial color="#1c1e22" />
      </mesh>

      {/* Tread bars */}
      <group ref={beltRef}>
        {Array.from({ length: TREAD_BARS }).map((_, index) => (
          <mesh key={index} position={[0, 0.18, 0]}>
            <boxGeometry args={[1.75, 0.01, 0.09]} />
            <meshStandardMaterial color="#4a4e55" />
          </mesh>
        ))}
      </group>

      {/* Rollers */}
      {[-1.9, 1.9].map((z) => (
        <mesh key={z} position={[0, 0.16, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 1.8, 16]} />
          <meshStandardMaterial color="#9aa0a8" />
        </mesh>
      ))}

      {/* Side Rails */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.05, 0.1, 4.0]} />
          <meshStandardMaterial color="#c4c8d0" />
        </mesh>
      ))}

      {/* Control Panel */}
      <mesh position={[0, 0.25, -1.95]} rotation={[Math.PI / 12, 0, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.2]} />
        <meshStandardMaterial color="#aeb3bb" />
      </mesh>

      {/* LED Display */}
      <mesh position={[0, 0.3, -1.93]} rotation={[Math.PI / 12, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.1]} />
        <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.8} />
      </mesh>

      {/* Rubber Feet */}
      {[
        [-0.8, -1.8],
        [0.8, -1.8],
        [-0.8, 1.8],
        [0.8, 1.8],
      ].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.03, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
          <meshStandardMaterial color="#6b7078" />
        </mesh>
      ))}

      <Nigiri position={[-0.3, 0.5, 1.2]} phase={0} toppingColor="#ff9470" stripeColor="#ffe2d6" />
      <Nigiri position={[0, 0.5, 0.2]} phase={Math.PI / 3} toppingColor="#cc3333" stripeColor="#8f1f1f" />
      <Nigiri position={[0.3, 0.5, -0.8]} phase={Math.PI / 1.5} toppingColor="#ffcc44" noriBand />
    </group>
  )
}
