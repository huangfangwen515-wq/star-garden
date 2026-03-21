// --- 3D 宇宙渲染核心 (scene_3d.js) ---

// 引入 Three.js 库 (从 CDN 引入)
import * as THREE from 'https://cdn.skypack.dev/three@0.140.0';

// 核心场景元素
let scene, camera, renderer, particles;
let starPositions = []; // 存储所有星星数据
let isDragging = false, previousMousePosition = { x: 0, y: 0 };
let currentTargetRotation = { x: 0, y: 0 }, currentRotation = { x: 0, y: 0 };

// 数据载入与启动
export function init3DScene(data) {
    if (!data || Object.keys(data).length === 0) {
        console.log("3D 宇宙初始化：暂无灵感数据。");
        return;
    }

    starPositions = data; // 绑定本地数据

    // 1. 创建场景与相机
    scene = new THREE.Scene();
    camera = new THREE.Camera(); // 将相机设为绝对视角
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15; // 相机深度

    // 2. 创建粒子（星星）系统
    const geometry = new THREE.BufferGeometry();
    const positions = [], colors = [], sizes = [];

    // 遍历所有领域
    for (const cat in starPositions) {
        const catData = starPositions[cat];
        const color = new THREE.Color(catData.color || '#ffffff');
        
        catData.stars.forEach(s => {
            // 将 2D 坐标转换为 3D 立体坐标 (基于领域中心点)
            positions.push(catData.centroid.x - window.innerWidth/2, catData.centroid.y - window.innerHeight/2, (Math.random()-0.5)*10);
            colors.push(color.r, color.g, color.b);
            sizes.push(4 + Math.min(s.content.length / 5, 10)); // 内容字数决定星星大小
        });
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // 使用着色器材质实现粒子效果 (breathe + glowing)
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            uniform float time;
            void main() {
                vColor = color;
                vec3 newPos = position;
                // 加入呼吸动画效果 (基于 ID 偏移)
                float breatheFactor = 1.0 + 0.1 * sin(time * 2.0 + float(gl_VertexID));
                newPos *= breatheFactor;
                vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z) * breatheFactor;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
                if (dist > 0.5) discard; // 粒子形状：圆
                float glow = 1.0 - dist * 2.0;
                gl_FragColor = vec4(vColor * glow, glow); // 光晕效果
            }
        `,
        blending: THREE.AdditiveBlending, // 加法混合提高发光亮度
        transparent: true,
        depthWrite: false, // 提高性能
        vertexColors: true
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 3. 创建渲染器并将其添加到网页
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    const container = document.getElementById('sky'); // 目标元素
    container.appendChild(renderer.domElement);

    // 4. 初始化拖拽交互 (全景旋转)
    const onMouseDown = (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
        if (!isDragging || !particles) return;
        const delta = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
        
        // 计算目标旋转角度
        currentTargetRotation.x += delta.y * 0.003;
        currentTargetRotation.y += delta.x * 0.003;
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };

    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    
    // 手机触控交互支持
    const onTouchStart = (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };
    const onTouchMove = (e) => {
        if (!isDragging || !particles || e.touches.length !== 1) return;
        const delta = { x: e.touches[0].clientX - previousMousePosition.x, y: e.touches[0].clientY - previousMousePosition.y };
        currentTargetRotation.x += delta.y * 0.003;
        currentTargetRotation.y += delta.x * 0.003;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    container.addEventListener('touchstart', onTouchStart, false);
    container.addEventListener('touchmove', onTouchMove, false);
    container.addEventListener('touchend', onMouseUp, false);

    // 5. 窗口调整大小自适应
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 6. 动画与渲染循环 (Three.js 主循环)
export function runSimulationLoop() {
    requestAnimationFrame(runSimulationLoop);
    if (!particles) return;

    // 加入呼吸动画的时间变量
    particles.material.uniforms.time.value += 0.01;

    // 平滑地插值旋转速度，提供更稳健的拖拽感
    currentRotation.x += (currentTargetRotation.x - currentRotation.x) * 0.1;
    currentRotation.y += (currentTargetRotation.y - currentRotation.y) * 0.1;
    
    particles.rotation.x = currentRotation.x;
    particles.rotation.y = currentRotation.y;

    renderer.render(scene, camera);
}
