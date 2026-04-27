
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Environment, Grid, ContactShadows } from '@react-three/drei';
import { Table } from './Table';
import { TableConfig } from '../types';
import { Suspense } from 'react';

interface SceneProps {
  config: TableConfig;
}

export function Scene({ config }: SceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[4, 4, 4]} fov={40} />
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 1.75} 
          target={[0, 0.5, 0]}
        />
        
        <Table config={config} />

        <ContactShadows 
          position={[0, 0, 0]} 
          opacity={0.6} 
          scale={15} 
          blur={1.5} 
          far={0.8} 
        />

        <Grid 
          infiniteGrid 
          fadeDistance={20} 
          fadeStrength={5} 
          cellSize={0.5} 
          sectionSize={2.5} 
          sectionColor="#4d4d4d" 
          cellColor="#666666" 
          position={[0, -0.001, 0]}
        />
        
        <Environment preset="apartment" />
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
      </Suspense>
    </Canvas>
  );
}
