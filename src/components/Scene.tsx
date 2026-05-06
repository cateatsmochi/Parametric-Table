
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, ContactShadows } from '@react-three/drei';
import { Table } from './Table';
import { TableConfig } from '../types';
import { Suspense, useImperativeHandle, forwardRef, useRef } from 'react';
import * as THREE from 'three';

interface SceneProps {
  config: TableConfig;
}

export interface SceneHandle {
  capture: () => string;
}

export const Scene = forwardRef<SceneHandle, SceneProps>(({ config }, ref) => {
  const contextRef = useRef<{ gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera } | null>(null);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (contextRef.current) {
        const { gl, scene, camera } = contextRef.current;
        
        // 1. Zoom in: move camera closer to the table
        const originalPos = camera.position.clone();
        camera.position.multiplyScalar(0.7);
        camera.lookAt(0, 0.5, 0);

        // 2. Hide GridLine (Grid helper)
        const grid = scene.getObjectByName('main-grid');
        const originalGridVisible = grid ? grid.visible : true;
        if (grid) grid.visible = false;

        // Force a render to ensure the buffer is up to date for the capture
        gl.render(scene, camera);
        const data = gl.domElement.toDataURL('image/png');

        // 3. Restore
        camera.position.copy(originalPos);
        camera.lookAt(0, 0.5, 0);
        if (grid) grid.visible = originalGridVisible;
        gl.render(scene, camera);

        return data;
      }
      return '';
    }
  }));

  return (
    <Canvas 
      shadows 
      dpr={[1, 2]} 
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={(state) => {
        contextRef.current = {
          gl: state.gl,
          scene: state.scene,
          camera: state.camera
        };
      }}
    >
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
          name="main-grid"
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
});
