
import { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { TableConfig, MaterialType } from '../types';

interface TableProps {
  config: TableConfig;
}

const getMaterial = (type: MaterialType, color: string) => {
  switch (type) {
    case 'oak':
      return <meshStandardMaterial color={color} roughness={0.8} />;
    case 'steel':
      return <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />;
    case 'glass':
      return <meshPhysicalMaterial 
        color={color} 
        transparent 
        opacity={0.3} 
        transmission={0.9} 
        thickness={0.5} 
        roughness={0} 
      />;
    case 'chrome':
      return <meshStandardMaterial color={color} metalness={1} roughness={0.1} />;
    case 'marble':
      return <meshStandardMaterial color={color} roughness={0.1} />;
    default:
      return <meshStandardMaterial color={color} />;
  }
};

export function Table({ config }: TableProps) {
  const { 
    width, depth, height, legTaper, topThickness, 
    frameDepth, frameInwardOffset, frameThickness,
    material, color, legTopSize, legBottomSize, legInnerDepth
  } = config;

  // Convert to meters
  const w = width / 100;
  const d = depth / 100;
  const totalH = height / 100;
  const tt = topThickness / 1000;
  const fd = frameDepth / 1000;
  const fi = frameInwardOffset / 1000;
  const ft = frameThickness / 1000;
  const taper = legTaper / 100;
  const lts = legTopSize / 1000;
  const lbs = legBottomSize / 1000;
  const lid = legInnerDepth / 1000;

  const legH = totalH - tt - fd;

  // 1. BEVELED HOLLOW FRAME (Rectangular Hole + Chamfered Outer)
  const subFrameGeometry = useMemo(() => {
    const ow2 = w / 2 - fi;
    const od2 = d / 2 - fi;
    
    // Outer Octagon (Chamfered Corners)
    const shape = new THREE.Shape();
    shape.moveTo(ow2 - lts, od2);
    shape.lineTo(-ow2 + lts, od2);
    shape.lineTo(-ow2, od2 - lts);
    shape.lineTo(-ow2, -od2 + lts);
    shape.lineTo(-ow2 + lts, -od2);
    shape.lineTo(ow2 - lts, -od2);
    shape.lineTo(ow2, -od2 + lts);
    shape.lineTo(ow2, od2 - lts);
    shape.closePath();

    // Inner Hole: PERFECT RECTANGLE (Responsive to leg protrusion)
    // Linkage: The frame's inner opening expands/contracts to meet the leg's internal peak
    const hw = ow2 - ft - lid;
    const hd = od2 - ft - lid;

    if (hw > 0 && hd > 0) {
      const hole = new THREE.Path();
      hole.moveTo(hw, hd);
      hole.lineTo(-hw, hd);
      hole.lineTo(-hw, -hd);
      hole.lineTo(hw, -hd);
      hole.closePath();
      shape.holes.push(hole);
    }

    const geo = new THREE.ExtrudeGeometry(shape, { depth: fd, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [w, d, fi, ft, fd, lts, lid]);

  // 2. DYNAMIC PENTAGONAL/QUAD LEGS (Manually Indexed & Watertight)
  const legGeometries = useMemo(() => {
    return [
      [1, 1],   // Front-Right
      [-1, 1],  // Front-Left
      [-1, -1], // Back-Left
      [1, -1],  // Back-Right
    ].map(([sx, sz]) => {
      const geo = new THREE.BufferGeometry();
      const ow2 = (w / 2 - fi);
      const od2 = (d / 2 - fi);
      const tx = sx * taper;
      const tz = sz * taper;

      const isPentagon = lid > 0;
      const hw = ow2 - ft - lid;
      const hd = od2 - ft - lid;
      
      // TOP VERTICES (y = legH)
      // v0, v1: Outer chamfer points
      // v2: Inner terminal Z
      // v3: Peak (Pentagon) or Inner Terminal X (Quad)
      // v4: Inner Terminal X (Pentagon only)
      
      const vTop: [number, number][] = [];
      vTop.push([sx * (ow2 - lts), sz * od2]); // v0
      vTop.push([sx * ow2, sz * (od2 - lts)]); // v1

      const thicknessOffset = ft - lts;

      if (isPentagon) {
        // Pentagon mode: Derived from a rectangle by extending the inner corner into a tail
        // Peak (v3) moves along the 45-degree axis by lid
        vTop.push([sx * (ow2 - thicknessOffset), sz * (od2 - ft)]); // v2
        vTop.push([sx * (ow2 - ft - lid), sz * (od2 - ft - lid)]);  // v3 (Extended Peak)
        vTop.push([sx * (ow2 - ft), sz * (od2 - thicknessOffset)]); // v4
      } else {
        // Quad mode: A true rectangle rotated 45 degrees to match the chamfer
        // The thickness is derived from frameThickness (ft).
        vTop.push([sx * (ow2 - thicknessOffset), sz * (od2 - ft)]); // v2
        vTop.push([sx * (ow2 - ft), sz * (od2 - thicknessOffset)]); // v3
      }

      // BOTTOM VERTICES (y = 0)
      // Scaled footprint
      const midPoint = [sx * (ow2 - lts/2), sz * (od2 - lts/2)];
      const scale = lbs / lts;
      const vBot = vTop.map(v => [
        (v[0] - midPoint[0]) * scale + midPoint[0] + tx,
        (v[1] - midPoint[1]) * scale + midPoint[1] + tz
      ]);

      const vertices: number[] = [];
      vTop.forEach(v => vertices.push(v[0], legH, v[1]));
      vBot.forEach(v => vertices.push(v[0], 0, v[1]));

      const numV = vTop.length;
      const indices: number[] = [];
      const reverse = sx * sz > 0;

      // 1. SIDES
      for (let i = 0; i < numV; i++) {
        const n = (i + 1) % numV;
        const t1 = i, t2 = n, b1 = i + numV, b2 = n + numV;
        if (reverse) {
          indices.push(t1, b2, t2, t1, b1, b2);
        } else {
          indices.push(t1, t2, b2, t1, b2, b1);
        }
      }

      // 2. TOP CAP
      if (isPentagon) {
        // Pentagon Indices: 0-1-2, 0-2-3, 0-3-4
        if (reverse) {
          indices.push(0, 4, 3, 0, 3, 2, 0, 2, 1);
        } else {
          indices.push(0, 1, 2, 0, 2, 3, 0, 3, 4);
        }
      } else {
        // Quad Indices: 0-1-2, 0-2-3
        if (reverse) {
          indices.push(0, 3, 2, 0, 2, 1);
        } else {
          indices.push(0, 1, 2, 0, 2, 3);
        }
      }

      // 3. BOTTOM CAP
      const offset = numV;
      if (isPentagon) {
        if (reverse) {
          indices.push(offset + 0, offset + 1, offset + 2, offset + 0, offset + 2, offset + 3, offset + 0, offset + 3, offset + 4);
        } else {
          indices.push(offset + 0, offset + 4, offset + 3, offset + 0, offset + 3, offset + 2, offset + 0, offset + 2, offset + 1);
        }
      } else {
        if (reverse) {
          indices.push(offset + 0, offset + 1, offset + 2, offset + 0, offset + 2, offset + 3);
        } else {
          indices.push(offset + 0, offset + 3, offset + 2, offset + 0, offset + 2, offset + 1);
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    });
  }, [w, d, fi, ft, lts, lbs, taper, legH, lid]);

  return (
    <group>
      {/* 1. TOP PANEL */}
      <mesh position={[0, totalH - tt / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, tt, d]} />
        {getMaterial(material, color)}
        <Edges color="black" threshold={15} />
      </mesh>

      {/* 2. HOLLOW FRAME */}
      <mesh 
        position={[0, totalH - tt - fd, 0]} 
        castShadow 
        receiveShadow 
        geometry={subFrameGeometry}
      >
        <meshStandardMaterial color="#333" roughness={0.6} />
        <Edges color="black" threshold={5} />
      </mesh>

      {/* 3. DYNAMIC LEGS */}
      {legGeometries.map((geo, i) => (
        <mesh 
          key={i} 
          geometry={geo} 
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={material === 'oak' ? color : '#222'} roughness={0.7} />
          <Edges color="black" threshold={5} />
        </mesh>
      ))}
    </group>
  );
}
