import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GestureState, HandData, PhotoData } from '../types';

interface SceneProps {
  handData: HandData;
  photos: PhotoData[];
  selectedIndex: number;
}

const NEEDLE_COUNT = 15000; 
const POPCORN_COUNT = 160;
const LIGHT_COUNT = 320; 
const BALL_COUNT = 90;
const FRICTION = 0.93;
const LERP_FACTOR = 0.08;

const Scene: React.FC<SceneProps> = ({ handData, photos, selectedIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HandData>(handData);
  const photosRef = useRef<PhotoData[]>(photos);
  const indexRef = useRef<number>(selectedIndex);
  const photoMeshesRef = useRef<THREE.Group[]>([]);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  useEffect(() => { stateRef.current = handData; }, [handData]);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => { indexRef.current = selectedIndex; }, [selectedIndex]);

  // 1. 初始随机星云位置
  const chaosPositions = useMemo(() => {
    const total = NEEDLE_COUNT + POPCORN_COUNT + BALL_COUNT + LIGHT_COUNT + 200;
    const pos = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const radius = 20 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, []);

  // 2. 圣诞树目标结构位置
  const treePositions = useMemo(() => {
    const needles = new Float32Array(NEEDLE_COUNT * 3);
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      const h = Math.random();
      const angle = h * Math.PI * 55 + Math.random() * 0.5;
      const radius = (1 - h) * 7.5 * (0.85 + Math.random() * 0.3);
      needles[i * 3] = Math.cos(angle) * radius;
      needles[i * 3 + 1] = h * 20 - 10;
      needles[i * 3 + 2] = Math.sin(angle) * radius;
    }

    const ornaments = (count: number, rBase: number) => {
      const p = new Float32Array(count * 3);
      for(let i=0; i<count; i++){
        const h = Math.random();
        const a = Math.random() * Math.PI * 2;
        const r = (1 - h) * rBase;
        p[i*3] = Math.cos(a) * r;
        p[i*3+1] = h * 20 - 10;
        p[i*3+2] = Math.sin(a) * r;
      }
      return p;
    };

    const lights = new Float32Array(LIGHT_COUNT * 3);
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const t = i / LIGHT_COUNT;
      const angle = t * Math.PI * 2 * 14;
      const radius = (1 - t) * 7.9;
      lights[i * 3] = Math.cos(angle) * radius;
      lights[i * 3 + 1] = t * 20 - 10;
      lights[i * 3 + 2] = Math.sin(angle) * radius;
    }

    return { 
      needles, 
      popcorn: ornaments(POPCORN_COUNT, 7.5), 
      lights, 
      balls: ornaments(BALL_COUNT, 8) 
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000604, 0.015);
    
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.4, 0.8);
    composer.addPass(bloom);

    // 高级材质
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4af37, metalness: 1, roughness: 0.1, emissive: 0x442200, emissiveIntensity: 0.2 
    });
    const emeraldMat = new THREE.MeshStandardMaterial({ 
      color: 0x032b1e, metalness: 0.8, roughness: 0.3 
    });
    const redMat = new THREE.MeshStandardMaterial({ 
      color: 0x900000, metalness: 0.7, roughness: 0.2, emissive: 0x220000 
    });

    scene.add(new THREE.AmbientLight(0x0a3322, 2.0));
    const topLight = new THREE.PointLight(0xffd700, 30, 80);
    topLight.position.set(0, 15, 10);
    scene.add(topLight);

    // 1. 顶部星辰
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 === 0) ? 1.0 : 0.4;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      starShape[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    const topStar = new THREE.Mesh(
      new THREE.ExtrudeGeometry(starShape, { depth: 0.25, bevelEnabled: true }), 
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd700, emissiveIntensity: 3.5 })
    );
    scene.add(topStar);

    // 2. 粒子系统
    const needleGeom = new THREE.BufferGeometry();
    const needlePos = new Float32Array(NEEDLE_COUNT * 3);
    const needleCol = new Float32Array(NEEDLE_COUNT * 3);
    for(let i=0; i<NEEDLE_COUNT; i++) {
      needlePos[i*3] = chaosPositions[i*3]; needlePos[i*3+1] = chaosPositions[i*3+1]; needlePos[i*3+2] = chaosPositions[i*3+2];
      const s = 0.4 + Math.random() * 0.6;
      needleCol[i*3] = 0.01 * s; needleCol[i*3+1] = 0.45 * s; needleCol[i*3+2] = 0.2 * s;
    }
    needleGeom.setAttribute('position', new THREE.BufferAttribute(needlePos, 3));
    needleGeom.setAttribute('color', new THREE.BufferAttribute(needleCol, 3));
    const needlePoints = new THREE.Points(needleGeom, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.75 }));
    scene.add(needlePoints);

    // 3. 装饰点缀系统
    const createInst = (geom: THREE.BufferGeometry, mat: THREE.Material, count: number) => {
      const m = new THREE.InstancedMesh(geom, mat, count);
      const curr = new Float32Array(count * 3);
      const vel = new Float32Array(count * 3);
      scene.add(m);
      return { mesh: m, curr, vel };
    };

    const popcorns = createInst(new THREE.IcosahedronGeometry(0.22, 0), goldMat, POPCORN_COUNT);
    const balls = createInst(new THREE.SphereGeometry(0.24, 12, 12), redMat, BALL_COUNT);
    const lightGlows = createInst(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), LIGHT_COUNT);

    const dummy = new THREE.Object3D();
    const curRot = { x: 0, y: 0 };
    const rotVel = { x: 0, y: 0.005 };
    const lastHand = { x: 0.5, y: 0.5 };
    const imageMorph = new Float32Array(NEEDLE_COUNT * 3);

    const animate = () => {
      const activeHand = stateRef.current;
      const currentPhotos = photosRef.current;
      const focusIndex = indexRef.current;
      const time = Date.now() * 0.001;

      // 更新相框 (奢华错落挂载)
      if (currentPhotos.length !== photoMeshesRef.current.length) {
        photoMeshesRef.current.forEach(m => scene.remove(m));
        photoMeshesRef.current = currentPhotos.map((p, idx) => {
          const group = new THREE.Group();
          
          const frameGroup = new THREE.Group();
          const outer = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7 / p.aspect, 0.15), emeraldMat);
          const inner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4 / p.aspect, 0.2), goldMat);
          frameGroup.add(outer, inner);

          const tex = textureLoader.load(p.url);
          const img = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3 / p.aspect), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
          img.position.z = 0.12;
          frameGroup.add(img);
          group.add(frameGroup);

          const string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4), goldMat);
          string.position.y = (1.4 / p.aspect) + 2.0;
          group.add(string);

          const h = 0.1 + Math.random() * 0.8;
          const angle = Math.random() * Math.PI * 2;
          const radius = (1 - h) * 8.0 + 1.0;
          (group as any).treePos = new THREE.Vector3(Math.cos(angle) * radius, h * 20 - 10, Math.sin(angle) * radius);
          (group as any).chaosPos = new THREE.Vector3((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50);
          (group as any).tilt = new THREE.Euler(0, 0, (Math.random()-0.5) * 0.6);
          
          scene.add(group);
          return group;
        });
      }

      const dx = activeHand.x - lastHand.x;
      const dy = activeHand.y - lastHand.y;
      if(activeHand.state !== GestureState.NONE) {
        rotVel.y += dx * 0.15; rotVel.x += dy * 0.15;
        lastHand.x = activeHand.x; lastHand.y = activeHand.y;
      }
      curRot.y += rotVel.y; curRot.x += rotVel.x;
      rotVel.x *= FRICTION; rotVel.y *= FRICTION;
      const rotMat = new THREE.Euler(curRot.x, curRot.y, 0);

      let tNeedle = chaosPositions.subarray(0, NEEDLE_COUNT * 3);
      let tPop = chaosPositions.subarray(NEEDLE_COUNT * 3, (NEEDLE_COUNT + POPCORN_COUNT)*3);
      let tBall = chaosPositions.subarray((NEEDLE_COUNT + POPCORN_COUNT)*3, (NEEDLE_COUNT + POPCORN_COUNT + BALL_COUNT)*3);
      let tLight = chaosPositions.subarray((NEEDLE_COUNT + POPCORN_COUNT + BALL_COUNT)*3, (NEEDLE_COUNT + POPCORN_COUNT + BALL_COUNT + LIGHT_COUNT)*3);
      let starVisible = 0.0;

      const isViewing = activeHand.state === GestureState.PINCH && currentPhotos.length > 0;

      if(activeHand.state === GestureState.FORMED){
        tNeedle = treePositions.needles; tPop = treePositions.popcorn; tBall = treePositions.balls; tLight = treePositions.lights;
        starVisible = 1.0;
      } else if(isViewing){
        // 使用当前选中的照片索引
        const safeIndex = Math.min(focusIndex, currentPhotos.length - 1);
        const p = currentPhotos[safeIndex];
        if(p) {
          for(let i=0; i<NEEDLE_COUNT; i++){
            const ix = i % (p.w * p.h);
            imageMorph[i*3] = (ix % p.w / p.w - 0.5) * 32;
            imageMorph[i*3+1] = (0.5 - Math.floor(ix/p.w) / p.h) * 32;
            imageMorph[i*3+2] = 15;
          }
          tNeedle = imageMorph;
        }
        starVisible = 0.2;
      }

      const updatePhys = (curr: Float32Array, target: Float32Array) => {
        for(let i=0; i<curr.length; i++) curr[i] += (target[i] - curr[i]) * LERP_FACTOR;
      };
      updatePhys(needlePos, tNeedle);
      needlePoints.geometry.attributes.position.needsUpdate = true;
      needlePoints.rotation.set(curRot.x, curRot.y, 0);

      const sync = (inst: any, target: Float32Array, type: string) => {
        updatePhys(inst.curr, target);
        for(let i=0; i<inst.mesh.count; i++){
          dummy.position.set(inst.curr[i*3], inst.curr[i*3+1], inst.curr[i*3+2]).applyEuler(rotMat);
          if(type === 'light') { 
            dummy.quaternion.copy(camera.quaternion); 
            dummy.scale.setScalar(0.7 + Math.sin(time*10 + i)*0.4); 
          } else { 
            dummy.rotation.set(time+i, i*0.2, 0); 
            dummy.scale.setScalar(1); 
          }
          dummy.updateMatrix();
          inst.mesh.setMatrixAt(i, dummy.matrix);
        }
        inst.mesh.instanceMatrix.needsUpdate = true;
      };
      sync(popcorns, tPop, 'pop'); sync(balls, tBall, 'ball'); sync(lightGlows, tLight, 'light');

      photoMeshesRef.current.forEach((group, idx) => {
        const isSelected = idx === focusIndex;
        const viewing = isViewing && isSelected;
        
        let targetPos = new THREE.Vector3();
        let targetScale = 1.0;

        if (viewing) {
          targetPos.set(0, 0, 22); 
          targetScale = 4.0;
          group.quaternion.slerp(new THREE.Quaternion(), 0.12);
        } else if (activeHand.state === GestureState.FORMED) {
          targetPos.copy((group as any).treePos).applyEuler(rotMat);
          // 选中的相框在树上稍微放大并浮动
          targetScale = isSelected ? 1.25 : 1.0;
          if(isSelected) {
            targetPos.y += Math.sin(time * 2) * 0.3;
          }
          group.lookAt(camera.position);
          group.rotation.z += (group as any).tilt.z;
        } else {
          targetPos.copy((group as any).chaosPos).applyEuler(rotMat);
          targetScale = activeHand.state === GestureState.NONE ? 0.001 : 0.8;
          group.rotation.set(time+idx, time*0.5, 0);
        }

        group.position.lerp(targetPos, viewing ? 0.12 : 0.07);
        group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, targetScale, 0.1));
      });

      topStar.position.set(0, 11, 0).applyEuler(rotMat);
      topStar.scale.setScalar(starVisible);
      topStar.rotation.y += 0.04;

      composer.render();
      requestAnimationFrame(animate);
    };

    animate();
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); renderer.dispose(); };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default Scene;
