/**
 * AvatarLipsync — renders a rigged .glb head and drives its `mouthOpen`
 * morph target from a live amplitude value (0..1), synced to AI reply
 * playback via `useAiCall`'s `mouthOpen`.
 *
 * Rendering: expo-gl (native GL context) + three.js, loaded through
 * expo-asset so the .glb can ship as a bundled Metro asset.
 */

import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AvatarLipsyncProps = {
  /**
   * Bundled .glb asset, e.g. `require('@/assets/models/avatar-head.glb')`.
   * Omit until a model with a `mouthOpen` (or `morphTargetName`) morph
   * target is available — the component renders nothing in that case.
   */
  source?: number;
  /** Live amplitude 0..1, sampled from the AI reply's playback position. */
  mouthOpen: number;
  /** Name of the morph target driving mouth-open on the head mesh. */
  morphTargetName?: string;
  size?: number;
  style?: ViewStyle;
};

const SMOOTHING = 0.35; // lerp factor per frame, keeps jaw motion from snapping

export const AvatarLipsync: React.FC<AvatarLipsyncProps> = ({
  source,
  mouthOpen,
  morphTargetName = 'mouthOpen',
  size = 260,
  style,
}) => {
  const mouthOpenRef = useRef(0);
  const displayedRef = useRef(0);
  const morphMeshesRef = useRef<THREE.Mesh[]>([]);
  const morphIndexRef = useRef<Map<THREE.Mesh, number>>(new Map());

  useEffect(() => {
    mouthOpenRef.current = mouthOpen;
  }, [mouthOpen]);

  if (!source) return null;

  const onContextCreate = async (gl: any) => {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    // expo-gl hands us a WebGL-compatible context; three's WebGLRenderer can
    // render straight into it as long as we flip the buffer ourselves via
    // `gl.endFrameEXP()` at the end of each frame (see `render` below).
    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientHeight: height,
      } as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGLRenderingContext,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(1, 1.5, 2);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const asset = Asset.fromModule(source);
    await asset.downloadAsync();

    const loader = new GLTFLoader();
    const gltf: GLTF = await new Promise((resolve, reject) => {
      loader.load(asset.localUri ?? asset.uri, resolve, undefined, reject);
    });

    const root = gltf.scene;
    scene.add(root);

    // Frame the head: center it and fit it to the view regardless of the
    // source model's own scale/origin.
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
    root.position.sub(center);
    const scale = 1.6 / maxDim;
    root.scale.setScalar(scale);

    const morphMeshes: THREE.Mesh[] = [];
    const morphIndex = new Map<THREE.Mesh, number>();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const dict = mesh.morphTargetDictionary;
      if (mesh.isMesh && dict && morphTargetName in dict) {
        morphMeshes.push(mesh);
        morphIndex.set(mesh, dict[morphTargetName]);
      }
    });
    morphMeshesRef.current = morphMeshes;
    morphIndexRef.current = morphIndex;

    let raf: number;
    const render = () => {
      raf = requestAnimationFrame(render);

      // Smooth toward the latest amplitude so mouth motion doesn't snap
      // between the ~50ms envelope samples arriving from useAiCall.
      displayedRef.current +=
        (mouthOpenRef.current - displayedRef.current) * SMOOTHING;

      for (const mesh of morphMeshesRef.current) {
        const idx = morphIndexRef.current.get(mesh);
        if (idx !== undefined && mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[idx] = displayedRef.current;
        }
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();

    return () => cancelAnimationFrame(raf);
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
};
