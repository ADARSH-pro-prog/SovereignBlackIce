import React from 'react';
import { EDGES, NODES, PATH_ANSWERS, PATH_CLAIMS, TAMPERED_SOURCE } from './story';

// Static stand-in for the 3D lattice: reduced motion, no WebGL, and while three.js loads.
const W = 1600;
const H = 900;
const px = (x: number) => W / 2 + x * 120 + 180;
const py = (y: number) => H / 2 - y * 95;

const onPath = new Set([TAMPERED_SOURCE, ...PATH_CLAIMS, ...PATH_ANSWERS]);

export const Poster: React.FC = () => (
  <svg
    viewBox={`0 0 ${W} ${H}`}
    preserveAspectRatio="xMidYMid slice"
    className="h-full w-full"
    role="presentation"
  >
    <g stroke="rgb(127 227 255 / 0.16)" strokeWidth="1">
      {EDGES.map((e, i) => {
        const a = NODES[e.from].pos;
        const b = NODES[e.to].pos;
        return (
          <line
            key={i}
            x1={px(a[0])}
            y1={py(a[1])}
            x2={px(b[0])}
            y2={py(b[1])}
            stroke={e.hop !== undefined ? 'rgb(255 181 71 / 0.4)' : undefined}
          />
        );
      })}
    </g>
    {NODES.map((n, i) => {
      const hot = onPath.has(i);
      const r = n.tier === 0 ? 5 : n.tier === 1 ? 3.5 : 4.5;
      const fill = hot ? '#FFB547' : '#7FE3FF';
      return (
        <g key={n.id} opacity={0.35 + (n.pos[2] + 1.6) / 6}>
          <circle cx={px(n.pos[0])} cy={py(n.pos[1])} r={r * 3} fill={fill} opacity="0.08" />
          <circle cx={px(n.pos[0])} cy={py(n.pos[1])} r={r} fill={fill} />
        </g>
      );
    })}
  </svg>
);
