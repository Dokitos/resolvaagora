'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, OrbitControls } from '@react-three/drei'
import type { Mesh, Group } from 'three'

const BLACK = '#161616'
const YELLOW = '#F5B301'

function Knot() {
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.25
      ref.current.rotation.x += delta * 0.08
    }
  })
  return (
    <mesh ref={ref} castShadow>
      <torusKnotGeometry args={[1.05, 0.34, 220, 32]} />
      <meshStandardMaterial color={YELLOW} roughness={0.25} metalness={0.55} />
    </mesh>
  )
}

function FloatingBits() {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y -= delta * 0.06
  })
  const bits = [
    { p: [2.4, 1.3, -1.2], s: 0.32, c: YELLOW },
    { p: [-2.6, -1.1, -0.8], s: 0.42, c: BLACK },
    { p: [2.1, -1.5, 0.6], s: 0.26, c: BLACK },
    { p: [-2.2, 1.6, 0.4], s: 0.3, c: YELLOW },
    { p: [0.2, 2.3, -1.6], s: 0.24, c: YELLOW },
  ] as const

  return (
    <group ref={group}>
      {bits.map((b, i) => (
        <Float key={i} speed={2} rotationIntensity={1.2} floatIntensity={1.4}>
          <mesh position={b.p as unknown as [number, number, number]}>
            <icosahedronGeometry args={[b.s, 0]} />
            <meshStandardMaterial color={b.c} roughness={0.3} metalness={0.4} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

export default function Scene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color={YELLOW} />
      <directionalLight position={[-5, -3, -4]} intensity={0.7} color="#ffffff" />
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.9}>
        <Knot />
      </Float>
      <FloatingBits />
      <Environment preset="city" />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        rotateSpeed={0.4}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  )
}
