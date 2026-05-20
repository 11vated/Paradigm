/**
 * Friend3DAvatar — procedural Three.js humanoid driven by Friend genes.
 *
 * In-browser only. Deterministic shape from gene values (height, build,
 * skin/hair colors). Idle animation parameterized by persona traits.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { FriendSeedData } from '@/lib/friend';

const rgbToColor = (rgb: [number, number, number]) =>
  new THREE.Color(rgb[0], rgb[1], rgb[2]);

export const Friend3DAvatar: React.FC<{ friend: FriendSeedData; size?: number }> = ({ friend, size = 320 }) => {
  const mount = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 1.5, 3.4);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(size, size);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 2.5);
    scene.add(key);

    // Procedural humanoid from genes.
    const heightM = friend.genes.body.heightScale * 1.2 + 0.8; // 0.8 → 2.0 m
    const build = (friend.genes.body.shoulderRatio - 0.6) / 0.8;
    const muscle = 0.5;
    const skin = rgbToColor(friend.genes.body.skinTone);
    const hair = rgbToColor(friend.genes.face.hairColor);
    const radius = 0.18 + build * 0.08 + muscle * 0.05;

    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62, metalness: 0.0 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.45, metalness: 0.0 });

    // Body
    const bodyHeight = heightM * 0.45;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(radius, bodyHeight, 6, 12), skinMat);
    body.position.y = bodyHeight / 2 + 0.5;
    group.add(body);

    // Head
    const headR = radius * 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 32, 24), skinMat);
    head.position.y = bodyHeight + 0.5 + headR;
    group.add(head);

    // Hair cap (top half)
    const hairR = headR * 1.04;
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(hairR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hairMesh.position.y = head.position.y;
    group.add(hairMesh);

    // Limbs
    const limbR = radius * 0.42;
    const armLen = bodyHeight * 0.95;
    const legLen = heightM * 0.42;

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(limbR, armLen, 4, 8), skinMat);
      arm.position.set(side * (radius + limbR + 0.02), bodyHeight * 0.7 + 0.5, 0);
      arm.rotation.z = side * 0.08;
      group.add(arm);

      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(limbR * 1.05, legLen, 4, 8), skinMat);
      leg.position.set(side * (radius * 0.4), legLen / 2 + 0.05, 0);
      group.add(leg);
    }

    scene.add(group);

    // Idle animation parameterized by persona.
    const energy = friend.genes.persona.bigFive.extraversion;
    const breath = 0.005 + energy * 0.015;
    const sway = 0.04 + energy * 0.10;
    let t = 0;
    let raf = 0;
    const tick = () => {
      t += 0.016;
      group.position.y = Math.sin(t * (1.2 + energy)) * breath;
      group.rotation.y = Math.sin(t * 0.4) * sway;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      group.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    };
  }, [friend, size]);

  return (
    <div ref={mount} style={{ width: size, height: size }} className="rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950" />
  );
};
