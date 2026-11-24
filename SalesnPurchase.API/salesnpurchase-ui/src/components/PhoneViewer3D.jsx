import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function PhoneViewer3D({ imagePath, frameColor = '#1c1c1e' }) {
    const mountRef = useRef(null);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const width = container.clientWidth || 280;
        const height = container.clientHeight || 240;

        // 1. Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 4.2);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // 2. Studio Lighting Rig
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
        keyLight.position.set(4, 5, 5);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
        rimLight.position.set(-4, 2, -4);
        scene.add(rimLight);

        const fillLight = new THREE.DirectionalLight(0xf59e0b, 1.2);
        fillLight.position.set(-3, -2, 3);
        scene.add(fillLight);

        // 3. Create 3D Phone Geometry
        const group = new THREE.Group();
        const phoneGeometry = new THREE.BoxGeometry(1.6, 3.2, 0.18);

        // Metallic Frame Material for top, bottom, left, right sides
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(frameColor),
            metalness: 0.9,
            roughness: 0.15,
        });

        // Glossy Jet-Black OLED Front Glass Screen Material
        const frontScreenMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#060608'),
            metalness: 0.95,
            roughness: 0.05,
        });

        const textureLoader = new THREE.TextureLoader();
        let backCoverMaterial = frameMaterial;

        // Apply texture ONLY to the back face (Index 5)
        if (imagePath) {
            textureLoader.load(
                imagePath,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.minFilter = THREE.LinearFilter;
                    backCoverMaterial = new THREE.MeshStandardMaterial({
                        map: texture,
                        metalness: 0.2,
                        roughness: 0.3,
                    });

                    // BoxGeometry Face Mapping:
                    // 0: Right, 1: Left, 2: Top, 3: Bottom, 4: Front (Screen), 5: Back (Cover)
                    phoneMesh.material = [
                        frameMaterial,       // Right
                        frameMaterial,       // Left
                        frameMaterial,       // Top
                        frameMaterial,       // Bottom
                        frontScreenMaterial, // Front (Black Glass Screen)
                        backCoverMaterial    // Back (Product Image Texture)
                    ];
                },
                undefined,
                (err) => console.warn("Failed to load texture for 3D Viewer:", err)
            );
        }

        const phoneMesh = new THREE.Mesh(phoneGeometry, [
            frameMaterial,
            frameMaterial,
            frameMaterial,
            frameMaterial,
            frontScreenMaterial,
            backCoverMaterial
        ]);
        phoneMesh.castShadow = true;
        phoneMesh.receiveShadow = true;
        group.add(phoneMesh);

        // Initial Dynamic Tilt
        group.rotation.x = 0.2;
        group.rotation.z = -0.1;

        scene.add(group);

        // 4. Interactive Mouse / Touch Dragging
        let isDragging = false;
        let previousPointerPosition = { x: 0, y: 0 };

        const onPointerDown = (e) => {
            isDragging = true;
            previousPointerPosition = { x: e.clientX, y: e.clientY };
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - previousPointerPosition.x;
            const deltaY = e.clientY - previousPointerPosition.y;

            group.rotation.y += deltaX * 0.008;
            group.rotation.x += deltaY * 0.008;

            group.rotation.x = Math.max(-0.8, Math.min(0.8, group.rotation.x));

            previousPointerPosition = { x: e.clientX, y: e.clientY };
        };

        const onPointerUp = () => {
            isDragging = false;
        };

        const domElement = renderer.domElement;
        domElement.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        // 5. Continuous Smooth Auto-Rotation Loop
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            if (!isDragging) {
                group.rotation.y += 0.012;
            }

            renderer.render(scene, camera);
        };

        animate();

        // Handle Window Resize
        const handleResize = () => {
            if (!container) return;
            const newW = container.clientWidth;
            const newH = container.clientHeight;
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            domElement.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', handleResize);
            if (container) container.innerHTML = '';
            renderer.dispose();
        };
    }, [imagePath, frameColor]);

    return (
        <div className="relative w-full h-64 group">
            <div
                ref={mountRef}
                className="w-full h-64 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
            />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none">
                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#0B0F17]/90 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full shadow-md backdrop-blur-md">
                    3D Interactive • Drag to Rotate
                </span>
            </div>
        </div>
    );
}