import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type StlCoinSide = 'jollyRoger' | 'sunnyGo';

interface StlCoinCanvasProps {
  result: StlCoinSide | null;
  flipping: boolean;
  loadModel?: boolean;
  className?: string;
}

const COIN_GLB_URL = '/ui/onepiece-decision-coin.glb';
const FLIP_DURATION_MS = 1650;

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function makeLabelTexture(label: string, background: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(256, 220, 30, 256, 256, 244);
    gradient.addColorStop(0, '#fff3b8');
    gradient.addColorStop(0.58, background);
    gradient.addColorStop(1, '#704513');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(256, 256, 244, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = '#fff0aa';
    context.lineWidth = 18;
    context.beginPath();
    context.arc(256, 256, 218, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = '#17110a';
    context.font = '900 54px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const [index, line] of label.split(' ').entries()) {
      context.fillText(line.toUpperCase(), 256, 228 + index * 64);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((entry) => {
    if (entry instanceof THREE.Mesh) {
      entry.geometry.dispose();
      const materials = Array.isArray(entry.material) ? entry.material : [entry.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        material.dispose();
      });
    }
  });
}

function createFallbackCoin(): THREE.Group {
  const coin = new THREE.Group();
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xb57a22, metalness: 0.85, roughness: 0.34 });
  const jollyMaterial = new THREE.MeshStandardMaterial({
    map: makeLabelTexture('Jolly Roger', '#dca436'),
    metalness: 0.62,
    roughness: 0.38,
  });
  const sunnyMaterial = new THREE.MeshStandardMaterial({
    map: makeLabelTexture('Sunny Go', '#e4572e'),
    metalness: 0.62,
    roughness: 0.38,
  });
  const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.2, 96), [edgeMaterial, jollyMaterial, sunnyMaterial]);
  coinMesh.rotation.x = Math.PI / 2;
  coin.add(coinMesh);
  coin.rotation.set(-0.38, 0, 0.08);
  return coin;
}

export function StlCoinCanvas({ result, flipping, loadModel = true, className }: StlCoinCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const coinRef = useRef<THREE.Group | null>(null);
  const flipStartRef = useRef<number | null>(null);
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.18, 5.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xffe7a3, 3.2);
    keyLight.position.set(-2.6, 3.4, 4.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.55);
    rimLight.position.set(3.2, 1.2, 2.8);
    scene.add(rimLight);

    const fillLight = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(fillLight);

    const fallbackCoin = createFallbackCoin();
    coinRef.current = fallbackCoin;
    scene.add(fallbackCoin);

    let disposed = false;
    let loadTimeout = 0;

    if (loadModel) {
      setModelStatus('loading');
      loadTimeout = window.setTimeout(() => {
        const loader = new GLTFLoader();
        loader.load(
          COIN_GLB_URL,
          (gltf) => {
            if (disposed) {
              disposeObject(gltf.scene);
              return;
            }

            const coin = new THREE.Group();
            const model = gltf.scene;
            model.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
                if (object.material instanceof THREE.MeshStandardMaterial) {
                  object.material.metalness = Math.max(object.material.metalness, 0.72);
                  object.material.roughness = Math.min(object.material.roughness, 0.42);
                  object.material.needsUpdate = true;
                }
              }
            });

            const bounds = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            bounds.getCenter(center);
            bounds.getSize(size);
            model.position.sub(center);
            const scale = 2.65 / Math.max(size.x, size.y, size.z, 1);
            model.scale.setScalar(scale);

            coin.add(model);
            coin.rotation.copy(fallbackCoin.rotation);
            coin.position.copy(fallbackCoin.position);
            scene.remove(fallbackCoin);
            disposeObject(fallbackCoin);
            coinRef.current = coin;
            scene.add(coin);
            setModelStatus('ready');
          },
          undefined,
          () => setModelStatus('failed'),
        );
      }, 450);
    } else {
      setModelStatus('idle');
    }

    const resize = (): void => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    let animationFrame = 0;
    const animate = (now: number): void => {
      resize();
      const coin = coinRef.current;
      if (coin) {
        const finalY = result === 'sunnyGo' ? Math.PI : 0;
        if (flipping) {
          if (flipStartRef.current === null) flipStartRef.current = now;
          const progress = Math.min(1, (now - flipStartRef.current) / FLIP_DURATION_MS);
          const eased = easeOutCubic(progress);
          coin.rotation.x = -0.38 + Math.sin(progress * Math.PI) * 1.15;
          coin.rotation.y = eased * (Math.PI * 10 + finalY);
          coin.rotation.z = 0.08 + Math.sin(progress * Math.PI * 3) * 0.22;
          coin.position.y = Math.sin(progress * Math.PI) * 0.34;
        } else {
          flipStartRef.current = null;
          coin.rotation.x = -0.38 + Math.sin(now / 1600) * 0.045;
          coin.rotation.y = result === null ? now / 4200 : finalY + Math.sin(now / 1700) * 0.035;
          coin.rotation.z = 0.08 + Math.sin(now / 1500) * 0.025;
          coin.position.y = Math.sin(now / 1300) * 0.035;
        }
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    resize();
    animationFrame = window.requestAnimationFrame(animate);
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.clearTimeout(loadTimeout);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      coinRef.current = null;
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [loadModel]);

  useEffect(() => {
    flipStartRef.current = null;
  }, [flipping, result]);

  return (
    <div ref={mountRef} className={['pointer-events-none relative h-full w-full', className ?? ''].filter(Boolean).join(' ')}>
      {modelStatus === 'loading' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-max rounded-full border border-gold/25 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-gold/80">
          Loading model
        </div>
      )}
      {modelStatus === 'failed' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-max rounded-full border border-gold/25 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-gold/80">
          Using fallback coin
        </div>
      )}
    </div>
  );
}
