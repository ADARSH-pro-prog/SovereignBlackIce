import React, { useEffect, useRef } from 'react';

/*
  Liquid mercury: metaballs that drift on their own and swarm to a click.
  Plain WebGL (no deps), dark and low-contrast so it stays behind content.
  Reduced motion: renders a single still frame.
*/

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uAttr;   // last click, 0..1 (y up)
uniform float uPull;  // 0..1, decays after a click
uniform float uIntensity;

const int N = 6;
vec3 attrW;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 center(float i) {
  float t = uTime * 0.45;
  vec3 drift = vec3(
    1.6 * sin(t * (0.55 + 0.11 * i) + i * 1.9) + 0.9,
    0.95 * cos(t * (0.47 + 0.09 * i) + i * 2.7),
    0.6 * sin(t * 0.6 + i * 1.3)
  );
  vec3 swarm = attrW + 0.35 * vec3(sin(i * 2.1 + t), cos(i * 1.7 + t), sin(i));
  return mix(drift, swarm, uPull);
}

float map(vec3 p) {
  float d = 1e5;
  for (int k = 0; k < N; k++) {
    float i = float(k);
    float r = 0.38 + 0.12 * mod(i * 2.0, 3.0);
    d = smin(d, length(p - center(i)) - r, 0.6);
  }
  return d;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

// Studio environment the chrome reflects: dark floor, ice horizon, softbox strips
vec3 env(vec3 r) {
  // silver studio: bright sky, dark floor, crisp horizon, two softboxes, violet ombre underneath
  vec3 col = mix(vec3(0.05, 0.06, 0.09), vec3(0.62, 0.70, 0.80), smoothstep(-0.35, 0.55, r.y));
  col = mix(col, vec3(0.08, 0.06, 0.16), smoothstep(-0.1, -0.8, r.y));
  col += vec3(0.55, 0.36, 0.95) * smoothstep(-0.25, -0.75, r.y) * 0.45;
  col += vec3(0.65, 0.92, 1.0) * smoothstep(0.035, 0.0, abs(r.y + 0.02)) * 1.1;
  col += vec3(1.0) * smoothstep(0.5, 0.85, r.y) * smoothstep(0.28, 0.0, abs(r.x + 0.35)) * 1.2;
  col += vec3(0.85, 0.95, 1.0) * smoothstep(0.15, 0.5, r.y) * smoothstep(0.12, 0.0, abs(r.x - 0.55)) * 0.8;
  col += vec3(1.0) * pow(max(0.0, dot(r, normalize(vec3(0.6, 0.5, 0.6)))), 40.0);
  return col;
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, 5.0);
  vec3 rd = normalize(vec3(uv, -1.8));
  attrW = vec3(((uAttr * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0)) * (5.0 / 1.8), 0.0);

  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 72; i++) {
    float d = map(ro + rd * t);
    if (d < 0.002) { hit = 1.0; break; }
    t += d;
    if (t > 12.0) break;
  }

  vec3 col = vec3(0.0);
  if (hit > 0.5) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 r = reflect(rd, n);
    float fres = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
    col = env(r) * (0.75 + 0.5 * fres);
    col = mix(col, col * vec3(0.78, 0.92, 1.0), 0.3); // cool, icy chrome
  } else {
    // faint glow near the liquid, otherwise the void
    float g = map(ro + rd * 5.0);
    col = vec3(0.25, 0.45, 0.8) * 0.06 * exp(-max(g, 0.0) * 2.5);
  }
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

export const LiquidChrome: React.FC<{ intensity?: number; className?: string }> = ({
  intensity = 1,
  className = '',
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!canvas || !gl) return;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u('uRes'), uTime = u('uTime'), uAttr = u('uAttr'), uPull = u('uPull'), uInt = u('uIntensity');

    // Render at reduced resolution: it's a soft background, this keeps it cheap.
    const scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.6;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const attr = { x: 0.5, y: 0.5 };
    let pull = 0;
    let pullTarget = 0;
    let lastClick = 0;
    const down = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      attr.x = (e.clientX - r.left) / r.width;
      attr.y = 1 - (e.clientY - r.top) / r.height;
      pullTarget = 1;
      lastClick = performance.now();
    };
    window.addEventListener('pointerdown', down, { passive: true });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      if (now - lastClick > 2600) pullTarget = 0; // release, blobs drift apart again
      pull += (pullTarget - pull) * 0.03;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uAttr, attr.x, attr.y);
      gl.uniform1f(uPull, pull);
      gl.uniform1f(uInt, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      if (!document.hidden && !reduced) raf = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', down);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intensity]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none block h-full w-full ${className}`} />;
};
