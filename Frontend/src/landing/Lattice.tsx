import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'motion/react';
import {
  EDGES,
  INJECTED_SOURCE,
  NODES,
  PATH_ANSWERS,
  PATH_CLAIMS,
  TAMPERED_SOURCE,
} from './story';

/*
  THE KNOWLEDGE LATTICE
  Sources → claims → AI answers, drawn as glowing points and hairline edges.
  Scroll progress (0..1 over the seven chapters) drives camera and node state.
  All per-frame work mutates buffers and DOM refs directly; React never re-renders per frame.
*/

const ICE = new THREE.Color('#7FE3FF');
const AMBER = new THREE.Color('#FFB547');
const RED = new THREE.Color('#FF5A4E');
const N = NODES.length;
const SEG = 14; // subdivisions per edge, so heat can travel along it

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const LOW_POWER =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4);

interface Props {
  progress: MotionValue<number>;
  simulate: boolean;
  entering: boolean;
  paused?: boolean;
}

/** Everything the frame loop derives once and every layer reads. */
interface Frame {
  s: number; // 0..7 story position
  lock: number;
  change: number;
  inject: number;
  prop: number; // 0..1 propagation along the path
  dim: number;
  shell: number;
  sim: number;
  enter: number;
  hover: number;
  heat: Float32Array; // per node 0..1
}

/* ─── Shaders ──────────────────────────────────────────────── */

const pointVert = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  uniform float uScale;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * uScale * (260.0 / -mv.z);
    vColor = color;
    vFade = smoothstep(40.0, 7.0, -mv.z);
  }
`;

const pointFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.13, 0.04, d);
    float halo = pow(smoothstep(0.5, 0.0, d), 2.2) * 0.55;
    float a = (core + halo) * vFade;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (core + halo), a);
  }
`;

function pointMaterial(scale: number) {
  return new THREE.ShaderMaterial({
    vertexShader: pointVert,
    fragmentShader: pointFrag,
    uniforms: { uScale: { value: scale } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/* ─── Director: state + camera + labels ────────────────────── */

const CAM_KEYS = (() => {
  const focus = (i: number, off: [number, number, number]) => {
    // Look slightly left of the node so it sits in the right half, clear of the copy.
    const p = new THREE.Vector3(...NODES[i].pos);
    const look = p.clone().add(new THREE.Vector3(-2.4, 0, 0));
    return { pos: look.clone().add(new THREE.Vector3(...off)), look };
  };
  const wide = (pos: [number, number, number], look: [number, number, number]) => ({
    pos: new THREE.Vector3(...pos),
    look: new THREE.Vector3(...look),
  });
  return [
    wide([-1.5, 0.6, 16], [-2.2, 0, 0]), // 01 problem
    focus(TAMPERED_SOURCE, [1.2, 0.8, 7.5]), // 02 fingerprint
    focus(TAMPERED_SOURCE, [0.8, 0.4, 6]), // 03 change
    focus(INJECTED_SOURCE, [1.2, 0.6, 7]), // 04 injection
    wide([-2.8, 1.2, 14.5], [-1.8, 0.8, 0]), // 05 impact
    wide([-3.5, 3.2, 15.5], [-2, 0.4, 0]), // 06 trust
    wide([-2, 2.5, 27], [-2.5, 0, 0]), // 07 sovereign
  ];
})();

const Director: React.FC<{
  props: Props;
  frame: React.MutableRefObject<Frame>;
  pointer: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
  labels: React.MutableRefObject<(HTMLDivElement | null)[]>;
}> = ({ props, frame, pointer, labels }) => {
  const { camera, size } = useThree();
  const camPos = useRef(CAM_KEYS[0].pos.clone());
  const camLook = useRef(CAM_KEYS[0].look.clone());
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tLook = useMemo(() => new THREE.Vector3(), []);
  const labelState = useRef<string[]>([]);

  useFrame((state, dt) => {
    const f = frame.current;
    dt = Math.min(dt, 0.05);
    const s = clamp(props.progress.get()) * 7;
    f.s = s;

    // Simulate toggle ramps its own clock regardless of scroll.
    f.sim = clamp(f.sim + (props.simulate ? dt / 2.4 : -dt / 1.2));
    f.enter = props.entering ? clamp(f.enter + dt / 1.1) : 0;

    f.lock = smooth(0.7, 1.3, s);
    f.change = Math.max(smooth(2.1, 2.6, s), smooth(0, 0.15, f.sim));
    f.inject = Math.max(smooth(3.1, 3.5, s) * (1 - 0.6 * smooth(6.2, 6.8, s)), smooth(0.05, 0.2, f.sim));
    f.prop = Math.max(clamp((s - 4.15) / 0.75), smooth(0.15, 1, f.sim));
    f.dim = Math.max(smooth(4.05, 4.5, s) * (1 - smooth(5.9, 6.5, s)), smooth(0.1, 0.4, f.sim) * 0.85);
    f.shell = smooth(5.9, 6.6, s);

    // Heat per node: source by change, claims then answers as the wave passes.
    f.heat.fill(0);
    f.heat[TAMPERED_SOURCE] = f.change;
    const w = f.prop * 2.2;
    PATH_CLAIMS.forEach((i) => (f.heat[i] = smooth(0.8, 1.05, w)));
    PATH_ANSWERS.forEach((i) => (f.heat[i] = smooth(1.8, 2.05, w)));

    // Camera: ease between chapter keyframes, then pointer parallax, then the fly-in.
    const k = clamp(s - 0.5, 0, CAM_KEYS.length - 1);
    const i0 = Math.floor(k);
    const i1 = Math.min(CAM_KEYS.length - 1, i0 + 1);
    const e = smooth(0, 1, k - i0);
    tPos.lerpVectors(CAM_KEYS[i0].pos, CAM_KEYS[i1].pos, e);
    tLook.lerpVectors(CAM_KEYS[i0].look, CAM_KEYS[i1].look, e);
    const p = pointer.current;
    tPos.x += p.x * 0.7;
    tPos.y += -p.y * 0.45;
    const damp = 1 - Math.exp(-dt * 2.6);
    camPos.current.lerp(tPos, damp);
    camLook.current.lerp(tLook, damp);
    camera.position.copy(camPos.current);
    if (f.enter > 0) {
      const t = f.enter * f.enter * f.enter;
      tmp.subVectors(camLook.current, camPos.current).multiplyScalar(t * 0.96);
      camera.position.add(tmp);
    }
    camera.lookAt(camLook.current);

    // Hover: nearest projected node within 56px of the pointer.
    let best = -1;
    let bestD = 56 * 56;
    const pts: [number, number, number][] = [];
    for (let i = 0; i < N; i++) {
      tmp.set(...NODES[i].pos).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      pts.push([x, y, tmp.z]);
      if (!p.active || tmp.z > 1) continue;
      const dx = x - ((p.x * 0.5 + 0.5) * size.width);
      const dy = y - ((p.y * 0.5 + 0.5) * size.height);
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    f.hover = best;

    // DOM labels: [hover, source, injected, answer×3]
    const want: [number, string, string, number][] = [
      [best, best >= 0 ? `${NODES[best].label} · ${NODES[best].meta}` : '', 'text-ink', best >= 0 ? 1 : 0],
      [
        TAMPERED_SOURCE,
        f.change > 0.5 ? 'annual_report.pdf · 163c7c…' : 'annual_report.pdf · e277b8…',
        f.change > 0.5 ? 'text-amber' : 'text-ice',
        best === TAMPERED_SOURCE ? 0 : Math.max(f.lock * (1 - f.shell), f.change * (1 - f.shell)),
      ],
      [INJECTED_SOURCE, 'Injection · quarantined', 'text-red', best === INJECTED_SOURCE ? 0 : f.inject * (1 - f.shell)],
      ...PATH_ANSWERS.map(
        (i) => [i, 'Review required', 'text-amber', best === i ? 0 : f.heat[i] * (1 - f.shell * 0.7)] as [number, string, string, number]
      ),
    ];
    want.forEach(([idx, text, tone, alpha], j) => {
      const el = labels.current[j];
      if (!el) return;
      if (idx < 0 || alpha < 0.02 || f.enter > 0) {
        el.style.opacity = '0';
        return;
      }
      const [x, y, z] = pts[idx];
      if (z > 1) {
        el.style.opacity = '0';
        return;
      }
      const key = text + tone;
      if (labelState.current[j] !== key) {
        labelState.current[j] = key;
        el.textContent = text;
        el.className = `lattice-label ${tone}`;
      }
      el.style.opacity = String(alpha);
      // Flip to the left of the node near the right edge so labels never clip.
      const w = el.offsetWidth;
      const lx = x + 14 + w > size.width - 12 ? x - 14 - w : x + 14;
      el.style.transform = `translate3d(${lx}px, ${y - 10}px, 0)`;
    });
  }, -1);

  return null;
};

/* ─── Nodes ────────────────────────────────────────────────── */

const Nodes: React.FC<{ frame: React.MutableRefObject<Frame> }> = ({ frame }) => {
  const { gl } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NODES.flatMap((n) => n.pos)), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N), 1));
    return g;
  }, []);
  const mat = useMemo(() => pointMaterial(gl.getPixelRatio()), [gl]);
  const c = useMemo(() => new THREE.Color(), []);
  const baseSize = useMemo(() => NODES.map((n) => [1.35, 0.85, 1.1][n.tier]), []);

  useFrame(({ clock }) => {
    const f = frame.current;
    const t = clock.elapsedTime;
    const col = geo.getAttribute('color') as THREE.BufferAttribute;
    const siz = geo.getAttribute('size') as THREE.BufferAttribute;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    for (let i = 0; i < N; i++) {
      const tier = NODES[i].tier;
      const breathe = 1 + 0.09 * Math.sin(t * 1.1 + i * 1.7);
      let bright = tier === 0 ? 0.95 : tier === 1 ? 0.7 : 0.8;
      if (tier === 0) bright += f.lock * 0.2;
      c.copy(ICE);
      const h = f.heat[i];
      if (h > 0) c.lerp(AMBER, h);
      if (i === INJECTED_SOURCE && f.inject > 0) {
        c.lerp(RED, f.inject);
        bright += f.inject * pulse * 0.6;
      }
      const onPath = h > 0.01 || (i === INJECTED_SOURCE && f.inject > 0.01);
      if (!onPath) bright *= 1 - f.dim * 0.72;
      if (i === f.hover) bright += 0.6;
      c.multiplyScalar(bright);
      col.setXYZ(i, c.r, c.g, c.b);
      siz.setX(i, baseSize[i] * breathe * (i === f.hover ? 1.5 : 1) * (1 + h * 0.25));
    }
    col.needsUpdate = true;
    siz.needsUpdate = true;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

/* ─── Edges ────────────────────────────────────────────────── */

const Edges: React.FC<{ frame: React.MutableRefObject<Frame> }> = ({ frame }) => {
  const { geo, meta } = useMemo(() => {
    const pos: number[] = [];
    const meta: { edge: number; u: number }[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const m = new THREE.Vector3();
    EDGES.forEach((e, ei) => {
      a.set(...NODES[e.from].pos);
      b.set(...NODES[e.to].pos);
      // Gentle bow so edges read as a lattice, not a wiring diagram.
      m.addVectors(a, b).multiplyScalar(0.5);
      m.z += ((ei % 3) - 1) * 0.6;
      m.y += 0.25;
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), m.clone(), b.clone());
      const pts = curve.getPoints(SEG);
      for (let k = 0; k < SEG; k++) {
        pos.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
        meta.push({ edge: ei, u: k / SEG }, { edge: ei, u: (k + 1) / SEG });
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(meta.length * 3), 3));
    return { geo: g, meta };
  }, []);
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const c = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const f = frame.current;
    const col = geo.getAttribute('color') as THREE.BufferAttribute;
    const w = f.prop * 2.2;
    const flicker = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 6);
    for (let v = 0; v < meta.length; v++) {
      const { edge, u } = meta[v];
      const e = EDGES[edge];
      c.copy(ICE).multiplyScalar(0.2);
      if (e.hop !== undefined) {
        const heat = clamp((w - e.hop - u) * 5);
        // Before propagation, the path edges glow faintly as the source cracks.
        const pre = e.hop === 0 ? f.change * 0.25 * (1 - u) : 0;
        const hh = Math.max(heat, pre);
        if (hh > 0) c.copy(ICE).multiplyScalar(0.2).lerp(AMBER, hh).multiplyScalar(0.2 + hh * 0.75);
      } else if (e.from === INJECTED_SOURCE && f.inject > 0) {
        c.lerp(RED, f.inject * 0.8).multiplyScalar(1 + f.inject * flicker * (1 - u));
        c.multiplyScalar(1 - f.dim * 0.5);
      } else {
        c.multiplyScalar(1 - f.dim * 0.75);
      }
      col.setXYZ(v, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  });

  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
};

/* ─── Fingerprint rings, quarantine ring, sovereign shell ──── */

const Ring: React.FC<{
  frame: React.MutableRefObject<Frame>;
  node: number;
  kind: 'lock' | 'quarantine';
}> = ({ frame, node, kind }) => {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: kind === 'lock' ? ICE : RED,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [kind]
  );
  useFrame(({ camera, clock }) => {
    const m = ref.current;
    if (!m) return;
    const f = frame.current;
    m.quaternion.copy(camera.quaternion);
    if (kind === 'lock') {
      const a = f.lock * (1 - f.shell * 0.8);
      mat.color.copy(ICE).lerp(AMBER, f.change);
      mat.opacity = a * 0.8;
      m.scale.setScalar(1 + (1 - f.lock) * 0.8 + Math.sin(clock.elapsedTime * 2) * 0.03);
    } else {
      const beat = (clock.elapsedTime * 0.9) % 1;
      mat.opacity = f.inject * (1 - beat) * 0.9;
      m.scale.setScalar(1 + beat * 1.6);
    }
    m.visible = mat.opacity > 0.01;
  });
  return (
    <mesh ref={ref} position={NODES[node].pos} material={mat}>
      <ringGeometry args={[0.34, 0.355, 72]} />
    </mesh>
  );
};

const Shell: React.FC<{ frame: React.MutableRefObject<Frame> }> = ({ frame }) => {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(9.5, 1)), []);
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: ICE,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const s = frame.current.shell;
    mat.opacity = s * 0.22;
    m.visible = s > 0.01;
    m.scale.setScalar(1.35 - s * 0.35);
    m.rotation.y += dt * 0.04;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} position={[0, 0, 0]} />;
};

const Dust: React.FC = () => {
  const count = LOW_POWER ? 90 : 420;
  const ref = useRef<THREE.Points>(null);
  const { gl } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const s = new Float32Array(count);
    let seed = 11;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
    for (let i = 0; i < count; i++) {
      p.set([r() * 34, r() * 20, r() * 22 - 3], i * 3);
      const b = 0.1 + Math.abs(r()) * 0.22;
      c.set([ICE.r * b, ICE.g * b, ICE.b * b], i * 3);
      s[i] = 0.25 + Math.abs(r()) * 0.35;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('size', new THREE.BufferAttribute(s, 1));
    return g;
  }, [count]);
  const mat = useMemo(() => pointMaterial(gl.getPixelRatio()), [gl]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.012;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
};

/* ─── Root ─────────────────────────────────────────────────── */

export default function Lattice(props: Props) {
  const frame = useRef<Frame>({
    s: 0,
    lock: 0,
    change: 0,
    inject: 0,
    prop: 0,
    dim: 0,
    shell: 0,
    sim: 0,
    enter: 0,
    hover: -1,
    heat: new Float32Array(N),
  });
  const pointer = useRef({ x: 0, y: 0, active: false });
  const labels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.current.active = e.pointerType === 'mouse';
    };
    const leave = () => (pointer.current.active = false);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={LOW_POWER ? [1, 1.25] : [1, 1.75]}
        frameloop={props.paused ? 'never' : 'always'}
        gl={{ antialias: !LOW_POWER, powerPreference: 'high-performance', alpha: true }}
        camera={{ fov: 42, near: 0.1, far: 80, position: [0, 0, 16] }}
      >
        <Director props={props} frame={frame} pointer={pointer} labels={labels} />
        <Dust />
        <Edges frame={frame} />
        <Nodes frame={frame} />
        <Ring frame={frame} node={TAMPERED_SOURCE} kind="lock" />
        <Ring frame={frame} node={INJECTED_SOURCE} kind="quarantine" />
        <Shell frame={frame} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              labels.current[i] = el;
            }}
            className="lattice-label"
            style={{ opacity: 0 }}
          />
        ))}
      </div>
    </div>
  );
}
