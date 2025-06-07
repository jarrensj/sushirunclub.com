"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { Center, Environment, OrbitControls } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Minus, Plus, Play, Pause, GripVertical, ChevronDown, Settings } from "lucide-react"

export default function TreadmillScene() {
  const [autoRotate, setAutoRotate] = useState(true)
  const [key, setKey] = useState(0) // Used to force re-render and reset position
  const [isRunning, setIsRunning] = useState(true)
  const [speed, setSpeed] = useState(1) // Speed from 0-3
  const [distance, setDistance] = useState(0) // Distance in kilometers
  const [startTime, setStartTime] = useState(Date.now())
  const lastUpdateTimeRef = useRef(Date.now())

  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  // Position panel in bottom right when minimized
  const [panelPosition, setPanelPosition] = useState({
    x: 0,
    y: 0,
  })
  const panelRef = useRef(null)

  // Initialize panel position on client-side
  useEffect(() => {
    setPanelPosition({
      x: window.innerWidth - 40,
      y: window.innerHeight - 40,
    })
  }, [])

  // Update distance based on speed
  useEffect(() => {
    if (!isRunning) {
      lastUpdateTimeRef.current = Date.now()
      return
    }

    const intervalId = setInterval(() => {
      const now = Date.now()
      const elapsedSeconds = (now - lastUpdateTimeRef.current) / 1000

      // Convert speed (mph) to km/h and calculate distance
      const speedInKmh = speed * 1.60934
      const distanceInKm = (speedInKmh * elapsedSeconds) / 3600

      setDistance((prev) => prev + distanceInKm)
      lastUpdateTimeRef.current = now
    }, 1000) // Update every second

    return () => clearInterval(intervalId)
  }, [isRunning, speed])

  // Reset distance and start time
  const resetDistance = () => {
    setDistance(0)
    setStartTime(Date.now())
    lastUpdateTimeRef.current = Date.now()
  }

  // Update panel position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isMinimized) {
        setPanelPosition({
          x: window.innerWidth - 40,
          y: window.innerHeight - 40,
        })
      } else {
        setPanelPosition({
          x: window.innerWidth - 300,
          y: window.innerHeight - 200,
        })
      }
    }

    window.addEventListener("resize", handleResize)
    // Set initial position
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [isMinimized])

  // Handle speed changes
  const increaseSpeed = () => {
    setSpeed((prev) => Math.min(prev + 0.5, 3))
    if (!isRunning && speed > 0) setIsRunning(true)
  }

  const decreaseSpeed = () => {
    setSpeed((prev) => Math.max(prev - 0.5, 0))
    if (speed <= 0.5) {
      setIsRunning(false)
    }
  }

  const toggleRunning = () => {
    if (!isRunning) {
      setIsRunning(true)
      lastUpdateTimeRef.current = Date.now()
      if (speed === 0) setSpeed(1)
    } else {
      setIsRunning(false)
    }
  }

  const handleSliderChange = (value: number[]) => {
    const newSpeed = value[0]
    setSpeed(newSpeed)
    setIsRunning(newSpeed > 0)
    if (newSpeed > 0 && !isRunning) {
      lastUpdateTimeRef.current = Date.now()
    }
  }

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized)

    // If expanding, move panel to a better position
    if (isMinimized) {
      setPanelPosition({
        x: window.innerWidth - 300,
        y: window.innerHeight - 200,
      })
    } else {
      // If minimizing, move to bottom right
      setPanelPosition({
        x: window.innerWidth - 40,
        y: window.innerHeight - 40,
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && panelRef.current) {
        // Calculate new position
        const newX = e.clientX
        const newY = e.clientY

        // Keep panel within viewport bounds
        const maxX = window.innerWidth - (isMinimized ? 40 : 280)
        const maxY = window.innerHeight - (isMinimized ? 40 : 180)

        setPanelPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isMinimized])

  // Format distance for display
  const formatDistance = (km) => {
    if (km < 0.01) {
      return `${(km * 1000).toFixed(0)} m`
    } else if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`
    } else {
      return `${km.toFixed(2)} km`
    }
  }

  // Calculate elapsed time
  const getElapsedTime = () => {
    const elapsedMs = Date.now() - startTime
    const seconds = Math.floor((elapsedMs / 1000) % 60)
    const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60)
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60))

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-slate-50 to-slate-200">
      {/* Distance Tracker */}
      <Card className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm shadow-lg">
        <CardContent className="p-3 flex flex-col items-end">
          <div className="w-full">
            <h3 className="text-sm font-medium text-slate-600">Current Run</h3>
          </div>
          <div className="flex flex-col items-end mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-800">{formatDistance(distance)}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Time: {getElapsedTime()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Draggable Speed Control Panel - Minimized or Expanded */}
      <Card
        ref={panelRef}
        className={`absolute z-10 backdrop-blur-sm shadow-lg cursor-move transition-all duration-200 ${
          isMinimized ? "w-12 h-12 rounded-full bg-white/90" : "w-64 bg-white/90"
        }`}
        style={{
          left: `${panelPosition.x}px`,
          top: `${panelPosition.y}px`,
          touchAction: "none",
          transform: isMinimized ? "translate(-50%, -50%)" : "translate(0, 0)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || e.target.closest(".drag-handle")) {
            e.preventDefault()
            setIsDragging(true)
          }
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          setPanelPosition({
            x: touch.clientX,
            y: touch.clientY,
          })
          setIsDragging(true)
        }}
      >
        {isMinimized ? (
          // Minimized view - just a circular button with speed indicator
          <div className="w-full h-full flex items-center justify-center relative" onClick={toggleMinimized}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        ) : (
          // Expanded view
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between drag-handle">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  <h3 className="text-lg font-medium">Treadmill Speed</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMinimized}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-sm font-medium bg-slate-100 px-2 py-1 rounded">{speed.toFixed(1)} mph</span>
                <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-green-500" : "bg-red-500"}`}></span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={decreaseSpeed} disabled={speed <= 0} className="h-8 w-8">
                  <Minus className="h-4 w-4" />
                </Button>

                <Slider
                  value={[speed]}
                  min={0}
                  max={3}
                  step={0.1}
                  className="flex-1"
                  onValueChange={handleSliderChange}
                />

                <Button variant="outline" size="icon" onClick={increaseSpeed} disabled={speed >= 3} className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button variant={isRunning ? "destructive" : "default"} className="w-full" onClick={toggleRunning}>
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Start
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Responsive header - moved down to avoid conflicts with top controls */}
      <h1
        className="absolute w-full text-center font-bold text-slate-800 z-10 px-4
                     text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl
                     top-16 sm:top-20 md:top-24 lg:top-28 xl:top-32"
      >
        Sushi Run Club
      </h1>

      <Canvas
        key={key}
        camera={{ position: [0, 2, 5], fov: 45, near: 0.1, far: 1000 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#f8fafc") // Match background color
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Center>
          <CameraController autoRotate={autoRotate} />
          <WalkingTreadmill isRunning={isRunning} speed={speed} />
        </Center>
        <Environment preset="studio" />
      </Canvas>
      <div className="absolute bottom-4 left-4 z-10">
        <Button
          onClick={() => setAutoRotate(!autoRotate)}
          variant="ghost"
          size="sm"
          className="bg-white/50 hover:bg-white/70 backdrop-blur-sm text-slate-600 text-xs rounded-full h-8 px-3"
        >
          {autoRotate ? "Stop Rotation" : "Start Rotation"}
        </Button>
      </div>
    </div>
  )
}

// Custom camera controller component
function CameraController({ autoRotate }) {
  const controlsRef = useRef()
  const { camera } = useThree()

  // Set up the camera and controls
  useEffect(() => {
    if (controlsRef.current) {
      // Set the camera to look at the treadmill
      camera.lookAt(0, 0.3, 0)

      // Update the controls
      controlsRef.current.update()
    }
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true} // Enable zoom functionality
      minDistance={2} // Minimum zoom distance
      maxDistance={10} // Maximum zoom distance
      zoomSpeed={0.5} // Adjust zoom speed
      enablePan={false} // Disable panning to prevent disappearing
      autoRotate={autoRotate}
      autoRotateSpeed={1.5} // Reduced from 3 to 1.5 for slower rotation
      minPolarAngle={Math.PI / 4} // Restrict vertical rotation (minimum)
      maxPolarAngle={Math.PI / 1.5} // Restrict vertical rotation (maximum)
      // Removed azimuth angle restrictions to allow full 360° rotation
      rotateSpeed={0.5} // Slower rotation for better control
      dampingFactor={0.1} // Add damping for smoother controls
      enableDamping={true} // Enable damping
    />
  )
}

// Salmon Nigiri Sushi component
function SalmonNigiri({ isRunning, speed, position = [0, 0.4, 0], rotationOffset = 0 }) {
  const sushiRef = useRef()
  const [bounce, setBounce] = useState(rotationOffset)
  const [rotation, setRotation] = useState(rotationOffset)

  // Animation for the sushi
  useFrame((state, delta) => {
    if (sushiRef.current) {
      // Bounce and rotate the sushi when running
      if (isRunning) {
        // Simulate running bounce
        setBounce((prev) => {
          const newBounce = prev + delta * 10 * speed
          return newBounce % (Math.PI * 2)
        })

        // Simulate rotation as it runs
        setRotation((prev) => {
          const newRotation = prev + delta * 5 * speed
          return newRotation % (Math.PI * 2)
        })
      }

      // Apply the bounce and rotation
      sushiRef.current.position.y = position[1] + Math.abs(Math.sin(bounce) * 0.05 * speed)
      sushiRef.current.rotation.z = Math.sin(bounce * 2) * 0.1 * speed
      sushiRef.current.rotation.x = rotation
    }
  })

  return (
    <group ref={sushiRef} position={position} scale={0.2}>
      {/* Rice Base - simple shape with no protruding elements */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.5]} />
        <meshStandardMaterial color="#f8f8f0" roughness={0.8} />
      </mesh>

      {/* Slightly rounded top of rice */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.78, 0.05, 0.48]} />
        <meshStandardMaterial color="#f8f8f0" roughness={0.8} />
      </mesh>

      {/* Salmon Topping - clean rectangular piece */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.85, 0.08, 0.55]} />
        <meshStandardMaterial color="#ff9470" roughness={0.6} />
      </mesh>

      {/* Slightly rounded front edge of salmon */}
      <mesh position={[0, 0.2, 0.27]}>
        <boxGeometry args={[0.85, 0.08, 0.02]} />
        <meshStandardMaterial color="#ff9470" roughness={0.6} />
      </mesh>

      {/* Slightly rounded back edge of salmon */}
      <mesh position={[0, 0.2, -0.27]}>
        <boxGeometry args={[0.85, 0.08, 0.02]} />
        <meshStandardMaterial color="#ff9470" roughness={0.6} />
      </mesh>

      {/* Salmon texture lines */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[0, 0.25, -0.1 + i * 0.1]}>
          <boxGeometry args={[0.84, 0.01, 0.01]} />
          <meshStandardMaterial color="#ff8060" roughness={0.6} />
        </mesh>
      ))}

      {/* Small Wasabi Dab between rice and fish */}
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#7fbc3b" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Tuna Nigiri Sushi component
function TunaNigiri({ isRunning, speed, position = [0, 0.4, 0], rotationOffset = 0 }) {
  const sushiRef = useRef()
  const [bounce, setBounce] = useState(rotationOffset)
  const [rotation, setRotation] = useState(rotationOffset)

  // Animation for the sushi
  useFrame((state, delta) => {
    if (sushiRef.current) {
      // Bounce and rotate the sushi when running
      if (isRunning) {
        // Simulate running bounce
        setBounce((prev) => {
          const newBounce = prev + delta * 10 * speed
          return newBounce % (Math.PI * 2)
        })

        // Simulate rotation as it runs
        setRotation((prev) => {
          const newRotation = prev + delta * 5 * speed
          return newRotation % (Math.PI * 2)
        })
      }

      // Apply the bounce and rotation
      sushiRef.current.position.y = position[1] + Math.abs(Math.sin(bounce) * 0.05 * speed)
      sushiRef.current.rotation.z = Math.sin(bounce * 2) * 0.1 * speed
      sushiRef.current.rotation.x = rotation
    }
  })

  return (
    <group ref={sushiRef} position={position} scale={0.2}>
      {/* Rice Base - simple shape with no protruding elements */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.5]} />
        <meshStandardMaterial color="#f8f8f0" roughness={0.8} />
      </mesh>

      {/* Slightly rounded top of rice */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.78, 0.05, 0.48]} />
        <meshStandardMaterial color="#f8f8f0" roughness={0.8} />
      </mesh>

      {/* Tuna Topping - clean rectangular piece (darker red) */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.85, 0.08, 0.55]} />
        <meshStandardMaterial color="#cc3333" roughness={0.6} />
      </mesh>

      {/* Slightly rounded front edge of tuna */}
      <mesh position={[0, 0.2, 0.27]}>
        <boxGeometry args={[0.85, 0.08, 0.02]} />
        <meshStandardMaterial color="#cc3333" roughness={0.6} />
      </mesh>

      {/* Slightly rounded back edge of tuna */}
      <mesh position={[0, 0.2, -0.27]}>
        <boxGeometry args={[0.85, 0.08, 0.02]} />
        <meshStandardMaterial color="#cc3333" roughness={0.6} />
      </mesh>

      {/* Tuna texture lines */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[0, 0.25, -0.1 + i * 0.1]}>
          <boxGeometry args={[0.84, 0.01, 0.01]} />
          <meshStandardMaterial color="#aa2222" roughness={0.6} />
        </mesh>
      ))}

      {/* Small Wasabi Dab between rice and fish */}
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#7fbc3b" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Tamago (Egg) Nigiri Sushi component
function TamagoNigiri({ isRunning, speed, position = [0, 0.4, 0], rotationOffset = 0 }) {
  const sushiRef = useRef()
  const [bounce, setBounce] = useState(rotationOffset)
  const [rotation, setRotation] = useState(rotationOffset)

  // Animation for the sushi
  useFrame((state, delta) => {
    if (sushiRef.current) {
      // Bounce and rotate the sushi when running
      if (isRunning) {
        // Simulate running bounce
        setBounce((prev) => {
          const newBounce = prev + delta * 10 * speed
          return newBounce % (Math.PI * 2)
        })

        // Simulate rotation as it runs
        setRotation((prev) => {
          const newRotation = prev + delta * 5 * speed
          return newRotation % (Math.PI * 2)
        })
      }

      // Apply the bounce and rotation
      sushiRef.current.position.y = position[1] + Math.abs(Math.sin(bounce) * 0.05 * speed)
      sushiRef.current.rotation.z = Math.sin(bounce * 2) * 0.1 * speed
      sushiRef.current.rotation.x = rotation
    }
  })

  return (
    <group ref={sushiRef} position={position} scale={0.2}>
      {/* Rice Base - simple shape with no protruding elements */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.5]} />
        <meshStandardMaterial color="#f8f8f0" roughness={0.8} />
      </mesh>

      {/* Slightly rounded top of rice */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.78, 0.05, 0.48]} />
        <meshStandardMaterial color="#f8f8f0" roughness={0.8} />
      </mesh>

      {/* Tamago (Egg) Topping - slightly taller than fish */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.85, 0.12, 0.55]} />
        <meshStandardMaterial color="#ffcc44" roughness={0.5} />
      </mesh>

      {/* Slightly rounded front edge of tamago */}
      <mesh position={[0, 0.22, 0.27]}>
        <boxGeometry args={[0.85, 0.12, 0.02]} />
        <meshStandardMaterial color="#ffcc44" roughness={0.5} />
      </mesh>

      {/* Slightly rounded back edge of tamago */}
      <mesh position={[0, 0.22, -0.27]}>
        <boxGeometry args={[0.85, 0.12, 0.02]} />
        <meshStandardMaterial color="#ffcc44" roughness={0.5} />
      </mesh>

      {/* Tamago texture - subtle lines */}
      {Array.from({ length: 2 }).map((_, i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.05, 0]}>
          <boxGeometry args={[0.86, 0.01, 0.56]} />
          <meshStandardMaterial color="#ffbb22" roughness={0.5} />
        </mesh>
      ))}

      {/* Small Nori Strip (seaweed) */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.86, 0.02, 0.56]} />
        <meshStandardMaterial color="#223322" roughness={0.7} />
      </mesh>
    </group>
  )
}

function WalkingTreadmill({ isRunning, speed }) {
  const treadmillRef = useRef()
  const beltRef = useRef()

  // Animation for the belt movement
  useFrame((state, delta) => {
    if (isRunning && beltRef.current) {
      // Move all the tread marks
      beltRef.current.children.forEach((child) => {
        child.position.z += speed * delta * 0.5

        // If a tread mark goes beyond the end, loop it back to the beginning
        if (child.position.z > 1.9) {
          child.position.z = -1.9
        }
      })
    }
  })

  return (
    <group ref={treadmillRef} position={[0, -0.5, 0]} scale={0.8}>
      {/* Treadmill Base - low profile for under desk */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.0, 0.1, 4.0]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Bottom Trim */}
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.1, 0.02, 4.1]} />
        <meshStandardMaterial color="#333333" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Running Belt (slightly raised from base) */}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.03, 3.8]} />
        <meshStandardMaterial color="#111111" roughness={0.7} />
      </mesh>

      {/* Belt Texture/Tread Pattern - now in a group for animation */}
      <group ref={beltRef}>
        {Array.from({ length: 38 }).map((_, i) => (
          <mesh key={i} position={[0, 0.18, -1.9 + i * 0.1]} rotation={[0, 0, 0]}>
            <boxGeometry args={[1.75, 0.01, 0.05]} />
            <meshStandardMaterial color="#333333" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Front Roller (where belt wraps around) */}
      <mesh position={[0, 0.16, -1.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 16]} />
        <meshStandardMaterial color="#444444" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Rear Roller (where belt wraps around) */}
      <mesh position={[0, 0.16, 1.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 16]} />
        <meshStandardMaterial color="#444444" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Minimal Side Rails - very low profile */}
      {/* Left Side Rail */}
      <mesh position={[-0.95, 0.2, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.1, 4.0]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Right Side Rail */}
      <mesh position={[0.95, 0.2, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.1, 4.0]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Front Control Panel - very minimal */}
      <mesh position={[0, 0.25, -1.95]} rotation={[Math.PI / 12, 0, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.2]} />
        <meshStandardMaterial color="#333333" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Control Panel Display */}
      <mesh position={[0, 0.27, -1.95]} rotation={[Math.PI / 12, 0, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.01]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.1} emissive="#1a1a2e" emissiveIntensity={0.2} />
      </mesh>

      {/* LED Display - changes color based on speed */}
      <mesh position={[0, 0.27, -1.945]} rotation={[Math.PI / 12, 0, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.005]} />
        <meshStandardMaterial
          color={isRunning ? (speed > 2 ? "#ff3300" : speed > 1 ? "#ffaa00" : "#00aaff") : "#666666"}
          roughness={0.1}
          emissive={isRunning ? (speed > 2 ? "#ff3300" : speed > 1 ? "#ffaa00" : "#00aaff") : "#666666"}
          emissiveIntensity={isRunning ? 0.5 : 0.1}
        />
      </mesh>

      {/* Rubber Feet */}
      <mesh position={[-0.8, 0.03, -1.8]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      <mesh position={[0.8, 0.03, -1.8]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      <mesh position={[-0.8, 0.03, 1.8]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>
      <mesh position={[0.8, 0.03, 1.8]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      {/* Add the three different Nigiri Sushi types */}
      <SalmonNigiri isRunning={isRunning} speed={speed} position={[-0.5, 0.4, 0.5]} rotationOffset={0} />
      <TunaNigiri isRunning={isRunning} speed={speed} position={[0, 0.4, 0]} rotationOffset={Math.PI / 3} />
      <TamagoNigiri isRunning={isRunning} speed={speed} position={[0.5, 0.4, -0.5]} rotationOffset={Math.PI / 1.5} />
    </group>
  )
}
