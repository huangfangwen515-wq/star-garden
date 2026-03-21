import * as THREE from 'https://cdn.skypack.dev/three@0.140.0';

let scene, camera, renderer, particles, raycaster, mouse;
let starDataMap = []; // 索引对应分类名
let onClickCallback = null;

export function init3DScene(data, callback) {
    onClickCallback = callback;
    const container = document.getElementById('sky');
    container.innerHTML = ''; // 清空旧画布

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.5; // 点击灵敏度
    mouse = new THREE.Vector2();

    const geometry = new THREE.BufferGeometry();
    const positions = [], colors = [], sizes = [];
    starDataMap = [];

    let catIndex = 0;
    for (const cat in data) {
        const color = new THREE.Color(data[cat].color);
        // 为每个领域分配一个大致的中心，让它们在 3D 空间散开
        const centerX = (Math.random() - 0.5) * 10;
        const centerY = (Math.random() - 0.5) * 10;
        const centerZ = (Math.random() - 0.5) * 10;

        data[cat].stars.forEach(s => {
            positions.push(centerX + (Math.random()-0.5)*2, centerY + (Math.random()-0.5)*2, centerZ + (Math.random()-0.5)*2);
            colors.push(color.r, color.g, color.b);
            sizes.push(5 + Math.min(s.content.length/5, 10));
            starDataMap.push(cat); // 记录这颗星星属于哪个分类
        });
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        map: createCircleTexture() // 使用自定义圆点贴图
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 点击事件处理
    container.onclick = (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(particles);
        if (intersects.length > 0) {
            const index = intersects[0].index;
            const catName = starDataMap[index];
            if(onClickCallback) onClickCallback(catName);
        }
    };

    // 基础旋转逻辑
    container.onmousemove = (e) => {
        if(e.buttons > 0) {
            particles.rotation.y += e.movementX * 0.005;
            particles.rotation.x += e.movementY * 0.005;
        }
    };
}

function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'white');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

export function runSimulationLoop() {
    requestAnimationFrame(runSimulationLoop);
    if(particles) {
        particles.rotation.y += 0.001; // 自动微调旋转
    }
    renderer.render(scene, camera);
}
