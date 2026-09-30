import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MotionValue } from 'motion/react';

/*
  BLACK ICE: a faceted glass crystal (the iceberg in the logo) with a ring of orbiting shards.
  - page scroll turns it, moves it across the page and dollies the camera
  - story scroll tints it: ice → amber (a source changed) → red (injection) → ice (sovereign)
  - pointer tilts it and drags the coloured lights; a click bursts the shards outward
  All per-frame work mutates refs; React never re-renders per frame.
*/

const LOW =
  typeof window !== 'undefined' && (window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4);
const REDUCED = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICE = new THREE.Color('#7FE3FF');
const AMBER = new THREE.Color('#FFB547');
const RED = new THREE.Color('#FF5A4E');
const VIOLET = new THREE.Color('#8B5CF6');
const X_AXIS = new THREE.Vector3(1, 0, 0);

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Deterministic PRNG so the crystal is the same shape on every load.
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/** Icosphere with its vertices pushed in/out: irregular, sharp-faceted ice. */
function crystalGeometry(radius: number, detail: number, jitter: number, seed: number, stretch = 1.35) {
  const r = rng(seed);
  const base = mergeVertices(new THREE.IcosahedronGeometry(radius, detail));
  const pos = base.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (r() - 0.5) * jitter;
    v.multiplyScalar(k);
    v.y *= stretch;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const g = base.toNonIndexed();
  g.computeVertexNormals();
  return g;
}

interface Props {
  page: MotionValue<number>; // 0..1 whole page
  story: MotionValue<number>; // 0..1 across the seven chapters
  entering: boolean;
  /** Dashboard mode: calmer, further back, right-aligned, no click burst. */
  ambient?: boolean;
}

/* ─── Environment: studio reflections + a dark aurora backdrop the glass can refract ─── */

const Environment: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
};

const skyVert = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFrag = `
  uniform float uTime; uniform vec3 uTint;
  varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    vec3 col = vec3(0.016, 0.022, 0.038);
    // slow aurora band behind the crystal
    float band = exp(-pow((d.y - 0.12 + 0.08 * sin(d.x * 3.0 + uTime * 0.15)) * 3.2, 2.0));
    float side = smoothstep(-0.2, 0.9, d.x);
    col += mix(vec3(0.24, 0.15, 0.50), uTint * 0.4, 0.4) * band * 0.7 * (0.3 + 0.7 * side);
    col += vec3(0.10, 0.30, 0.42) * exp(-pow((d.y + 0.35) * 2.5, 2.0)) * 0.18;
    gl_FragColor = vec4(col, 1.0);
  }`;

const Sky: React.FC<{ tint: React.MutableRefObject<THREE.Color> }> = ({ tint }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color('#7FE3FF') } },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    (mat.uniforms.uTint.value as THREE.Color).copy(tint.current);
  });
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[40, 48, 24]} />
    </mesh>
  );
};

/* ─── The scene ─────────────────────────────────────────────── */

const SHARDS = LOW ? 32 : 54;

const Scene: React.FC<Props> = ({ page, story, entering, ambient = false }) => {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const edges = useRef<THREE.LineSegments>(null);
  const core = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);
  const keyLight = useRef<THREE.PointLight>(null);
  const rimLight = useRef<THREE.PointLight>(null);
  const tint = useRef(ICE.clone());
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const burst = useRef(0);
  const enterT = useRef(0);

  const crystalGeo = useMemo(() => crystalGeometry(1.05, 1, 0.3, 7), []);
  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(crystalGeo, 12), [crystalGeo]);
  const edgeMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#bfefff',
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const coreGeo = useMemo(() => crystalGeometry(0.34, 0, 0.3, 19, 1.5), []);
  const shardGeo = useMemo(() => crystalGeometry(0.07, 0, 0.5, 3, 1.6), []);

  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#e4eef5'),
        metalness: 0.05,
        roughness: LOW ? 0.12 : 0.06,
        transmission: LOW ? 0.0 : 1,
        thickness: 1.8,
        ior: 1.42,
        iridescence: 1,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [180, 720],
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        attenuationColor: new THREE.Color('#1c2440'),
        attenuationDistance: 1.6,
        flatShading: true,
        envMapIntensity: 1.8,
        opacity: LOW ? 0.85 : 1,
        transparent: LOW,
      }),
    []
  );
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0f17',
        emissive: new THREE.Color('#7FE3FF'),
        emissiveIntensity: 1.2,
        flatShading: true,
        roughness: 0.3,
        metalness: 0.4,
      }),
    []
  );
  const shardMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#8fa9d6',
        metalness: 0.9,
        roughness: 0.18,
        iridescence: 0.8,
        iridescenceThicknessRange: [200, 600],
        clearcoat: 1,
        flatShading: true,
        envMapIntensity: 1.2,
      }),
    []
  );

  // Orbit parameters per shard.
  const orbits = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: SHARDS }, (_, i) => ({
      radius: 1.9 + r() * 1.3,
      speed: 0.08 + r() * 0.12,
      phase: (i / SHARDS) * Math.PI * 2 + r() * 0.4,
      lift: (r() - 0.5) * 1.1,
      spin: new THREE.Vector3(r(), r(), r()).multiplyScalar(1.5),
      scale: 0.5 + r() * 1.0,
    }));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const down = () => {
      if (!ambient) burst.current = 1;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
    };
  }, [ambient]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = ambient ? 0.8 : 0.95;
  }, [gl, ambient]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    const pg = page.get();
    const s = clamp(story.get()) * 7; // chapter position 0..7

    // Pointer, eased.
    const pt = pointer.current;
    pt.sx += (pt.x - pt.sx) * (1 - Math.exp(-dt * 3));
    pt.sy += (pt.y - pt.sy) * (1 - Math.exp(-dt * 3));
    burst.current = Math.max(0, burst.current - dt * 0.9);
    enterT.current = entering ? clamp(enterT.current + dt / 1.1) : 0;

    // Story tint: ice → amber (ch 3 change) → red (ch 4–5 injection/impact) → ice (ch 7).
    const amber = smooth(1.8, 2.6, s) * (1 - smooth(3.0, 3.6, s));
    const red = smooth(3.0, 3.6, s) * (1 - smooth(5.6, 6.3, s));
    tmpC.copy(ICE).lerp(AMBER, amber).lerp(RED, red);
    tint.current.lerp(tmpC, 1 - Math.exp(-dt * 2.5));

    // Crystal: idle spin + scroll turn + pointer tilt; drifts right → centre → left as you scroll.
    const g = group.current!;
    // right of the copy through the story, to centre stage for the closing
    const x = ambient
      ? 5.1 + Math.sin(pg * Math.PI * 2) * 0.3
      : THREE.MathUtils.lerp(2.6, 3.3, smooth(0.05, 0.25, pg)) * (1 - smooth(0.8, 0.95, pg)) + Math.sin(pg * Math.PI * 4) * 0.25;
    const y = Math.sin(t * 0.5) * 0.12 + (pg > 0.85 ? (pg - 0.85) * 2 : 0);
    g.position.set(x, y, 0);
    const c = crystal.current!;
    c.rotation.y = t * 0.12 + pg * Math.PI * 3;
    c.rotation.x = pt.sy * 0.35 + Math.sin(pg * Math.PI) * 0.35;
    c.rotation.z = -pt.sx * 0.25;
    const breathe = (ambient ? 0.8 : 1) + Math.sin(t * 0.8) * 0.015 + enterT.current * enterT.current * 1.5;
    c.scale.setScalar(breathe);
    // etched facet lines ride on the crystal and take the story tint
    edges.current!.rotation.copy(c.rotation);
    edges.current!.scale.setScalar(breathe * 1.002);
    edgeMat.color.copy(tint.current).lerp(new THREE.Color('#ffffff'), 0.35);
    edgeMat.opacity = 0.26 + Math.sin(t * 1.3) * 0.06;
    core.current!.rotation.copy(c.rotation);
    core.current!.rotation.y *= -1.4;
    coreMat.emissive.copy(tint.current);
    coreMat.emissiveIntensity = 0.9 + Math.sin(t * 2) * 0.15 + red * Math.abs(Math.sin(t * 5)) * 1.2;
    glass.attenuationColor.copy(VIOLET).lerp(tint.current, 0.45);

    // Shards: tilted ring that widens and tips as you scroll; a click throws them outward.
    const inst = shardsRef.current!;
    const spread = 1 + pg * 0.7 + burst.current * burst.current * 1.6;
    const tilt = 0.45 + pg * 0.9;
    orbits.forEach((o, i) => {
      const a = o.phase + t * o.speed * (1 + burst.current * 2);
      const rr = o.radius * spread;
      p.set(Math.cos(a) * rr, o.lift + Math.sin(a * 2 + i) * 0.15, Math.sin(a) * rr);
      p.applyAxisAngle(X_AXIS, tilt);
      e.set(t * o.spin.x, t * o.spin.y, t * o.spin.z);
      q.setFromEuler(e);
      sc.setScalar(o.scale * (ambient ? 0.6 : 1) * (1 - enterT.current));
      m.compose(p, q, sc);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;

    // Lights follow the pointer so facets flare as you move.
    keyLight.current!.position.set(x + pt.sx * 4, pt.sy * 3 + 2, 4);
    keyLight.current!.color.copy(tint.current);
    rimLight.current!.position.set(x - 3 - pt.sx * 2, -1.5 - pt.sy, -2.5);

    // Camera dolly: close in through the story, pull back at the end, dive in on "Enter".
    const z = ambient
      ? 12 - pg * 1.5
      : THREE.MathUtils.lerp(10.5, 9.4, smooth(0.1, 0.5, pg)) + smooth(0.8, 1, pg) * 1.5;
    camTarget.set(pt.sx * 0.6, pt.sy * 0.4 + 0.2, z - enterT.current * 7);
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 2.2));
    camera.lookAt(ambient ? 1.2 : x * 0.55, 0, 0);
  });

  return (
    <>
      <Environment />
      <Sky tint={tint} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <pointLight ref={keyLight} intensity={6} distance={0} decay={0} />
      <pointLight ref={rimLight} color={VIOLET} intensity={5} distance={0} decay={0} />
      <group ref={group}>
        <mesh ref={crystal} geometry={crystalGeo} material={glass} />
        <lineSegments ref={edges} geometry={edgeGeo} material={edgeMat} />
        <mesh ref={core} geometry={coreGeo} material={coreMat} />
        <instancedMesh ref={shardsRef} args={[shardGeo, shardMat, SHARDS]} frustumCulled={false} />
      </group>
      <Dust />
    </>
  );
};

const Dust: React.FC = () => {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = LOW ? 250 : 700;
    const r = rng(9);
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([(r() - 0.5) * 30, (r() - 0.5) * 18, (r() - 0.5) * 16 - 3], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.025}
        color="#9fdcff"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default function Crystal(props: Props) {
  return (
    <Canvas
      dpr={LOW ? [1, 1.25] : [1, 1.5]}
      frameloop={REDUCED ? 'demand' : 'always'}
      gl={{ antialias: !LOW, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 38, near: 0.1, far: 100, position: [0, 0.2, 9.5] }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
