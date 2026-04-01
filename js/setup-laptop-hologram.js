/**
 * Setup card: GLB — streaming edge hologram, then smooth textured fade-in.
 * Requires import map in index.html.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const GLB_URL = new URL("../asus_rog_zephyrus_g14_2024.glb", import.meta.url).href;

/** Total holo sequence length */
const HOLOGRAM_MS = 1000;
/** Edges “draw” along segments in this window first */
const EDGE_STREAM_MS = Math.round((3000 / 6800) * HOLOGRAM_MS);
/** Solids stay fully hidden until this (ms), then ease in */
const SOLID_DELAY_MS = Math.round((1100 / 6800) * HOLOGRAM_MS);

const EDGE_COLOR = 0x39ff8d;
/** Narrow beams from top of screen toward mesh while holo streams */
const LASER_COUNT = 14;
const LASER_COLOR = 0x9dffe8;
/** Small nudge along camera-up after top-edge unproject (× model size); keep modest so beams stay in-frame */
const LASER_LIFT = 0.22;
/** NDC y for beam origin (1 = top); lower = closer to model vertically on screen */
const LASER_TOP_NDC_Y = 0.91;
/** All beams share one origin (NDC x, 0 = top center) */
const LASER_ORIGIN_NDC_X = 0;
const ROT_SPEED = 0.32;
/** Slower envelope for physical props that otherwise pop (shell / trackpad) */
const SLOW_ENVELOPE_POW = 1.32;

const _tmpColor = new THREE.Color();
const _tmpSpec = new THREE.Color();
const _laserStart = new THREE.Vector3();
const _laserTip = new THREE.Vector3();
const _laserVert = new THREE.Vector3();
const _ndcLaser = new THREE.Vector3();
const _camUpLaser = new THREE.Vector3();

/**
 * World point above frame: top of viewport unproject, nudged along camera up.
 * @param {THREE.PerspectiveCamera} camera
 * @param {number} ndcX
 * @param {number} lift
 */
function laserOriginFromTop(camera, ndcX, lift) {
    _ndcLaser.set(ndcX, LASER_TOP_NDC_Y, 0.12).unproject(camera);
    _camUpLaser.set(0, 1, 0).applyQuaternion(camera.quaternion);
    return _laserStart.copy(_ndcLaser).addScaledVector(_camUpLaser, lift);
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} k
 */
function reservoirSample(arr, k) {
    if (arr.length <= k) {
        return arr.slice();
    }
    const out = arr.slice(0, k);
    for (let i = k; i < arr.length; i++) {
        const j = Math.floor(Math.random() * (i + 1));
        if (j < k) {
            out[j] = arr[i];
        }
    }
    return out;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** S-curve: no hard derivative at 0/1 — reduces end “pop” */
function smoothstep01(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
}

function easeInQuart(t) {
    return t * t * t * t;
}

const PHYS_FAST_KEYS = ["emissiveIntensity", "sheenRoughness", "attenuationDistance"];

const PHYS_SLOW_KEYS = new Set([
    "transmission",
    "clearcoat",
    "sheen",
    "iridescence",
    "specularIntensity",
    "thickness",
    "envMapIntensity",
    "reflectivity",
    "anisotropy",
    "iridescenceIOR",
    "dispersion",
]);

/**
 * @param {THREE.Material} mat
 * @param {boolean} reducedMotion
 * @param {unknown[]} solidTracks
 */
function makeSolidFadeable(mat, reducedMotion, solidTracks) {
    if (!mat) return null;
    if (reducedMotion) {
        return mat;
    }

    const m = mat.clone();
    const emissive = m.emissive ? m.emissive.clone() : new THREE.Color(0, 0, 0);
    const specularColor =
        "specularColor" in m && m.specularColor ? m.specularColor.clone() : null;
    const opacityTarget = typeof m.opacity === "number" && m.opacity < 1 ? m.opacity : 1;

    /** @type {Record<string, number>} */
    const fastNums = {};
    for (const k of PHYS_FAST_KEYS) {
        if (k in m && typeof m[k] === "number" && !Number.isNaN(m[k])) {
            fastNums[k] = m[k];
        }
    }
    /** @type {Record<string, number>} */
    const slowNums = {};
    for (const k of PHYS_SLOW_KEYS) {
        if (k in m && typeof m[k] === "number" && !Number.isNaN(m[k])) {
            slowNums[k] = m[k];
        }
    }

    const metalnessOrig = "metalness" in m && typeof m.metalness === "number" ? m.metalness : null;
    const roughnessOrig = "roughness" in m && typeof m.roughness === "number" ? m.roughness : null;

    const clearcoatRoughness =
        "clearcoatRoughness" in m && typeof m.clearcoatRoughness === "number"
            ? m.clearcoatRoughness
            : 0.5;

    const alphaTestOrig = typeof m.alphaTest === "number" ? m.alphaTest : 0;
    const iorOrig = "ior" in m && typeof m.ior === "number" ? m.ior : null;
    const alphaHashOrig = "alphaHash" in m && m.alphaHash === true;

    const polygonOffsetOrig = {
        polygonOffset: m.polygonOffset,
        polygonOffsetFactor: m.polygonOffsetFactor,
        polygonOffsetUnits: m.polygonOffsetUnits,
    };

    m.transparent = true;
    m.opacity = 0;
    m.depthWrite = false;
    m.depthTest = true;
    m.blending = THREE.NormalBlending;
    /** Cutouts + masked trims (trackpad, shell edges) pop if alphaTest fights opacity */
    m.alphaTest = 0;
    /** Reduce z-fighting between stacked shells while transparent */
    m.polygonOffset = true;
    m.polygonOffsetFactor = 2;
    m.polygonOffsetUnits = 2;

    if ("alphaHash" in m) {
        m.alphaHash = false;
    }

    m.needsUpdate = true;

    if (m.emissive) m.emissive.set(0, 0, 0);
    if ("specularColor" in m && m.specularColor) m.specularColor.set(0, 0, 0);
    if (metalnessOrig !== null) m.metalness = 0;
    if (roughnessOrig !== null) m.roughness = 1;
    for (const k of Object.keys(fastNums)) {
        m[k] = 0;
    }
    for (const k of Object.keys(slowNums)) {
        m[k] = 0;
    }
    if ("clearcoatRoughness" in m) m.clearcoatRoughness = 1;
    if (iorOrig !== null) m.ior = 1;

    const track = {
        mat: m,
        em: emissive,
        specularColor,
        opacityTarget,
        fastNums,
        slowNums,
        metalnessOrig,
        roughnessOrig,
        clearcoatRoughness,
        alphaTestOrig,
        iorOrig,
        polygonOffsetOrig,
        alphaHashOrig,
    };
    solidTracks.push(track);
    return m;
}

/**
 * @param {typeof solidTracks[0]} track
 * @param {number} solidE linear 0–1 (time-based)
 */
function applySolidFade(track, solidE) {
    const {
        mat,
        em,
        specularColor,
        opacityTarget,
        fastNums,
        slowNums,
        metalnessOrig,
        roughnessOrig,
        clearcoatRoughness,
        alphaTestOrig,
        iorOrig,
        polygonOffsetOrig,
        alphaHashOrig,
    } = track;
    const e = Math.max(0, Math.min(1, solidE));
    const w = smoothstep01(e);
    const wSlow = Math.pow(w, SLOW_ENVELOPE_POW);

    mat.opacity = opacityTarget * w;

    _tmpColor.copy(em).multiplyScalar(w);
    if (mat.emissive) mat.emissive.copy(_tmpColor);

    if (specularColor && "specularColor" in mat) {
        _tmpSpec.copy(specularColor).multiplyScalar(wSlow);
        mat.specularColor.copy(_tmpSpec);
    }

    for (const [k, v] of Object.entries(fastNums)) {
        if (k in mat) mat[k] = v * w;
    }
    for (const [k, v] of Object.entries(slowNums)) {
        if (k in mat) mat[k] = v * wSlow;
    }

    if ("clearcoatRoughness" in mat) {
        mat.clearcoatRoughness = THREE.MathUtils.lerp(1, clearcoatRoughness, wSlow);
    }

    if (iorOrig !== null && "ior" in mat) {
        mat.ior = THREE.MathUtils.lerp(1, iorOrig, wSlow);
    }

    if (metalnessOrig !== null && "metalness" in mat) {
        mat.metalness = THREE.MathUtils.lerp(0, metalnessOrig, wSlow);
    }
    if (roughnessOrig !== null && "roughness" in mat) {
        mat.roughness = THREE.MathUtils.lerp(1, roughnessOrig, wSlow);
    }

    /** One threshold so depth, offsets, and masks don’t update on different frames (shell/trackpad z-fight flashes). */
    const fadeDone = w >= 0.998 && opacityTarget >= 0.995;

    if (alphaTestOrig > 0) {
        mat.alphaTest = alphaTestOrig * w;
    } else {
        mat.alphaTest = 0;
    }

    mat.depthWrite = fadeDone;

    if (fadeDone) {
        mat.polygonOffset = polygonOffsetOrig.polygonOffset;
        mat.polygonOffsetFactor = polygonOffsetOrig.polygonOffsetFactor;
        mat.polygonOffsetUnits = polygonOffsetOrig.polygonOffsetUnits;
        if ("alphaHash" in mat) mat.alphaHash = alphaHashOrig;
        /** Opaque shells in the transparent queue can sort/blend differently at opacity 1 — snap to opaque path once fade is done. */
        if (opacityTarget >= 0.999) {
            mat.transparent = false;
            mat.opacity = 1;
        }
    }

    mat.needsUpdate = true;
}

function init() {
    const wrap = document.getElementById("setup-model-wrap");
    const canvas = document.getElementById("setup-three-canvas");
    if (!wrap || !canvas) {
        return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0b0a);

    const camera = new THREE.PerspectiveCamera(56, 1, 0.05, 200);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xe8e4df, 0x1a1815, 0.75);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(2.5, 6, 4);
    scene.add(dir);

    const root = new THREE.Group();
    scene.add(root);

    /** @type {{ lines: THREE.LineSegments; material: THREE.LineBasicMaterial; maxVert: number }[]} */
    const edgeStreams = [];
    /** @type {Parameters<typeof makeSolidFadeable>[2] extends (infer U)[] ? U : never} */
    const solidTracks = [];
    const nativeLineHide = [];

    function setSize() {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (w < 1 || h < 1) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    const ro = new ResizeObserver(setSize);
    ro.observe(wrap);

    function revealWrap() {
        wrap.classList.add("is-loaded");
    }

    if (reducedMotion) {
        revealWrap();
    }

    const loader = new GLTFLoader();
    loader.load(
        GLB_URL,
        (gltf) => {
            /** @type {{ geom: THREE.BufferGeometry; pos: Float32Array; line: THREE.Line; phase: number; period: number; targetRef: { lines: THREE.LineSegments; i: number } }[]} */
            const laserBeams = [];
            let laserGroup = null;

            const model = gltf.scene;
            root.add(model);

            model.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxS = Math.max(size.x, size.y, size.z, 0.001);

            model.position.sub(center);

            const dist = maxS * 1.72;
            const th = THREE.MathUtils.degToRad(20);
            const ph = THREE.MathUtils.degToRad(58);
            camera.position.set(
                dist * Math.sin(ph) * Math.sin(th),
                dist * Math.cos(ph),
                dist * Math.sin(ph) * Math.cos(th)
            );
            camera.lookAt(0, 0, 0);

            model.traverse((obj) => {
                if ((obj.isLine || obj.isLineSegments) && !obj.userData._hologramWire) {
                    nativeLineHide.push(obj);
                    obj.visible = reducedMotion;
                    return;
                }

                const isDrawnMesh =
                    (obj.isMesh || obj.isSkinnedMesh || obj.isInstancedMesh) && obj.geometry;
                if (!isDrawnMesh) return;

                const mesh = obj;
                mesh.visible = true;

                try {
                    const edgesGeom = new THREE.EdgesGeometry(mesh.geometry, 22);
                    const edgeMat = new THREE.LineBasicMaterial({
                        color: EDGE_COLOR,
                        transparent: true,
                        opacity: 1,
                        depthWrite: false,
                        depthTest: true,
                        blending: THREE.AdditiveBlending,
                    });
                    const lines = new THREE.LineSegments(edgesGeom, edgeMat);
                    lines.userData._hologramWire = true;
                    lines.renderOrder = 2;

                    const maxVert = edgesGeom.attributes.position.count;
                    if (!reducedMotion) {
                        lines.geometry.setDrawRange(0, 0);
                    }
                    mesh.add(lines);
                    edgeStreams.push({ lines, material: edgeMat, maxVert });
                } catch (_) {
                    /* invalid geometry for edges */
                }

                if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map((mm) => makeSolidFadeable(mm, reducedMotion, solidTracks) ?? mm);
                } else {
                    const nm = makeSolidFadeable(mesh.material, reducedMotion, solidTracks);
                    if (nm) mesh.material = nm;
                }
            });

            if (!reducedMotion && edgeStreams.length > 0) {
                const laserTargetRefs = [];
                for (const item of edgeStreams) {
                    const pos = item.lines.geometry.attributes.position;
                    if (!pos) continue;
                    const lines = item.lines;
                    for (let i = 0; i < pos.count; i++) {
                        laserTargetRefs.push({ lines, i });
                    }
                }
                const sampled = reservoirSample(
                    laserTargetRefs,
                    Math.min(420, laserTargetRefs.length)
                );
                if (sampled.length > 0) {
                    laserGroup = new THREE.Group();
                    laserGroup.renderOrder = 10;
                    scene.add(laserGroup);
                    for (let i = 0; i < LASER_COUNT; i++) {
                        const geom = new THREE.BufferGeometry();
                        const pa = new Float32Array(6);
                        geom.setAttribute("position", new THREE.BufferAttribute(pa, 3));
                        const mat = new THREE.LineBasicMaterial({
                            color: LASER_COLOR,
                            transparent: true,
                            opacity: 0.85,
                            depthWrite: false,
                            /** Draw over mesh during holo; depth test was hiding beams behind shells */
                            depthTest: false,
                            blending: THREE.AdditiveBlending,
                        });
                        const line = new THREE.Line(geom, mat);
                        line.frustumCulled = false;
                        line.renderOrder = 10;
                        laserGroup.add(line);
                        laserBeams.push({
                            geom,
                            pos: pa,
                            line,
                            phase: Math.random() * Math.PI * 2,
                            period: 0.42 + Math.random() * 0.38,
                            targetRef: sampled[Math.floor(Math.random() * sampled.length)],
                        });
                    }
                }
            }

            setSize();
            revealWrap();

            if (reducedMotion) {
                edgeStreams.forEach(({ lines, maxVert }) => {
                    lines.geometry.setDrawRange(0, maxVert);
                });
                nativeLineHide.forEach((o) => {
                    o.visible = true;
                });
            }

            const clock = new THREE.Clock();
            const holoStart = reducedMotion ? null : performance.now();

            function animate() {
                requestAnimationFrame(animate);
                const dt = clock.getDelta();
                root.rotation.y += dt * ROT_SPEED;

                if (!reducedMotion && holoStart != null) {
                    const elapsed = performance.now() - holoStart;

                    const streamT = Math.min(1, elapsed / EDGE_STREAM_MS);
                    const streamDraw = easeInQuart(streamT);

                    edgeStreams.forEach(({ lines, maxVert }) => {
                        let n = Math.floor(maxVert * streamDraw);
                        n = Math.floor(n / 2) * 2;
                        lines.geometry.setDrawRange(0, n);
                    });

                    let solidE = 0;
                    if (elapsed >= SOLID_DELAY_MS) {
                        solidE = easeInOutCubic(
                            Math.min(1, (elapsed - SOLID_DELAY_MS) / (HOLOGRAM_MS - SOLID_DELAY_MS))
                        );
                    }

                    const edgeFade = 1 - solidE;
                    const baseOp = streamT < 0.02 ? streamT * 50 : 1;
                    edgeStreams.forEach(({ material }) => {
                        material.opacity = Math.max(0, Math.min(1, baseOp * edgeFade));
                    });

                    /** Lasers lead: not gated by edge-stream baseOp or streamDraw (those start at 0 and hid beams). */
                    const laserFade = edgeFade;
                    if (laserBeams.length > 0 && laserGroup) {
                        const lift = maxS * LASER_LIFT;
                        const lasersOn = elapsed <= HOLOGRAM_MS + 80;
                        laserGroup.visible = lasersOn;
                        if (lasersOn && laserFade > 0.015) {
                            laserOriginFromTop(camera, LASER_ORIGIN_NDC_X, lift);
                            for (const b of laserBeams) {
                                const ref = b.targetRef;
                                const mesh = ref.lines.parent;
                                _laserVert.fromBufferAttribute(
                                    ref.lines.geometry.attributes.position,
                                    ref.i
                                );
                                mesh.localToWorld(_laserVert);
                                const cy = ((elapsed * 0.001) / b.period + b.phase) % 1;
                                const reach = easeInOutCubic(cy);
                                _laserTip.lerpVectors(_laserStart, _laserVert, reach);
                                const p = b.pos;
                                p[0] = _laserStart.x;
                                p[1] = _laserStart.y;
                                p[2] = _laserStart.z;
                                p[3] = _laserTip.x;
                                p[4] = _laserTip.y;
                                p[5] = _laserTip.z;
                                b.geom.attributes.position.needsUpdate = true;
                                b.line.material.opacity = 0.88 * laserFade;
                            }
                        }
                    }

                    solidTracks.forEach((track) => applySolidFade(track, solidE));

                    if (solidE >= 0.99) {
                        nativeLineHide.forEach((o) => {
                            o.visible = true;
                        });
                    }
                }

                renderer.render(scene, camera);
            }

            animate();
        },
        undefined,
        (err) => {
            console.error("GLB load failed:", err);
            revealWrap();
        }
    );
}

try {
    init();
} catch (err) {
    console.error("setup-laptop-hologram init failed:", err);
    document.getElementById("setup-model-wrap")?.classList.add("is-loaded");
}
