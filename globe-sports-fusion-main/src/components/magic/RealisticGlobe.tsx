import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface GlobePoint {
  lat: number;
  lon: number;
  /** Intensité (0-1) — pondère la taille / brillance du flash */
  weight?: number;
  /** Couleur hex optionnelle */
  color?: string;
  /** Si true, scintillement rapide (pour les matchs en direct) */
  live?: boolean;
}

interface RealisticGlobeProps {
  points?: GlobePoint[];
  className?: string;
  /** Vitesse de rotation (rad/s) */
  rotationSpeed?: number;
}

// Textures Earth ultra-réalistes 4K (turban/webgl-earth — domaine public NASA)
const TEX_DAY = "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg";
const TEX_NORMAL = "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/elev_bump_4k.jpg";
const TEX_SPEC = "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/water_4k.png";
const TEX_CLOUDS = "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/fair_clouds_4k.png";



function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export const RealisticGlobe = ({
  points = [],
  className,
  rotationSpeed = 0.06,
}: RealisticGlobeProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const pointsKey = useMemo(
    () => points.map((p) => `${p.lat.toFixed(2)}_${p.lon.toFixed(2)}`).join("|"),
    [points],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Détection WebGL AVANT d'instancier THREE (sandbox/iframe peut échouer silencieusement)
    const probe = document.createElement("canvas");
    const gl =
      (probe.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (probe.getContext("webgl") as WebGLRenderingContext | null) ||
      (probe.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      console.warn("WebGL not supported, using fallback.");
      setFallback(true);
      return;
    }

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 320;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }
    // Si le contexte n'a pas pu être créé (échec async), bascule sur fallback
    if (!renderer.getContext()) {
      setFallback(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3.4);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.65;
    mount.appendChild(renderer.domElement);

    // Éclairage réaliste — bien plus lumineux
    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e1, 3.4);
    sun.position.set(5, 2, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd4ff, 1.0);
    fill.position.set(-4, -1, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(0, 4, -3);
    scene.add(rim);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    // Globe — matériau réaliste 4K, segments ultra-fins (256x256)
    const earthGeo = new THREE.SphereGeometry(1, 256, 256);
    const earthMat = new THREE.MeshPhongMaterial({
      map: loader.load(TEX_DAY, (t: THREE.Texture) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.minFilter = THREE.LinearMipMapLinearFilter;
      }),
      normalMap: loader.load(TEX_NORMAL, (t: THREE.Texture) => {
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }),
      normalScale: new THREE.Vector2(0.85, 0.85),
      specularMap: loader.load(TEX_SPEC),
      specular: new THREE.Color(0x4a6a8a),
      shininess: 22,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Nuages 4K
    const cloudGeo = new THREE.SphereGeometry(1.012, 192, 192);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: loader.load(TEX_CLOUDS, (t: THREE.Texture) => {
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(clouds);

    // Atmosphère (halo bleu fresnel)
    const atmosphereMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      uniforms: {
        glowColor: { value: new THREE.Color(0x4ec4ff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(glowColor, 1.0) * intensity;
        }
      `,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.18, 64, 64), atmosphereMat);
    scene.add(atmosphere);

    // Étoiles d'arrière-plan
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 30;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(p) * Math.cos(t);
      positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      positions[i * 3 + 2] = r * Math.cos(p);
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.18,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
      }),
    );
    scene.add(stars);

    // === Points scintillants des pays ===
    const markersGroup = new THREE.Group();
    earth.add(markersGroup); // attaché au globe pour tourner avec lui

    const markers: Array<{
      mesh: THREE.Mesh;
      ring: THREE.Mesh;
      beam: THREE.Mesh;
      phase: number;
      speed: number;
      weight: number;
      live: boolean;
    }> = [];

    const dotGeo = new THREE.SphereGeometry(0.012, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.018, 0.032, 32);
    const beamGeo = new THREE.CylinderGeometry(0.004, 0.012, 0.18, 12, 1, true);

    points.forEach((p) => {
      const pos = latLonToVec3(p.lat, p.lon, 1.005);
      const color = new THREE.Color(p.live ? "#fffc22" : (p.color ?? "#22e3ff"));
      const weight = p.weight ?? 1;

      // Point lumineux
      const dotMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      markersGroup.add(dot);

      // Anneau pulsant
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      markersGroup.add(ring);

      // Faisceau vertical
      const beamMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      const beamPos = pos.clone().multiplyScalar(1.09);
      beam.position.copy(beamPos);
      beam.lookAt(pos.clone().multiplyScalar(2));
      beam.rotateX(Math.PI / 2);
      markersGroup.add(beam);

      markers.push({
        mesh: dot,
        ring,
        beam,
        phase: Math.random() * Math.PI * 2,
        speed: p.live ? (4 + Math.random() * 3) : (1.8 + Math.random() * 1.6),
        weight,
        live: !!p.live,
      });
    });

    // === Boucle d'animation ===
    let raf = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      // Rotation avec un léger mouvement de "flottaison" (oscillation d'inclinaison)
      earth.rotation.y += rotationSpeed * dt;
      earth.rotation.x = Math.sin(t * 0.4) * 0.05; // Léger balancement axial
      earth.position.y = Math.sin(t * 0.8) * 0.03; // Flottaison verticale
      
      clouds.rotation.y += rotationSpeed * 1.25 * dt;
      clouds.rotation.x = earth.rotation.x;
      clouds.position.y = earth.position.y;
      
      stars.rotation.y -= 0.01 * dt;
      stars.rotation.x += 0.005 * dt;

      markers.forEach((m) => {
        // Pulsation douce et continue, sans scintillement aléatoire
        const s = (Math.sin(t * m.speed + m.phase) + 1) / 2; // 0..1
        const liveBoost = m.live ? 1.15 : 1;

        const sc = (0.85 + s * 1.35 * m.weight) * liveBoost;
        m.mesh.scale.setScalar((0.7 + s * 1.4 * m.weight) * liveBoost);
        m.ring.scale.setScalar(sc * 1.3);
        (m.ring.material as THREE.MeshBasicMaterial).opacity =
          (0.15 + (1 - s) * 0.65) * (m.live ? 1 : 0.8);
        (m.beam.material as THREE.MeshBasicMaterial).opacity =
          (0.25 + s * 0.55 * m.weight) * (m.live ? 1.35 : 1);
        m.beam.scale.y = (0.6 + s * 1.4) * (m.live ? 1.2 : 1);
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Resize
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return; // Prevent 0-size resize
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmosphereMat.dispose();
      starsGeo.dispose();
      dotGeo.dispose();
      ringGeo.dispose();
      beamGeo.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, rotationSpeed]);

  if (fallback) {
    return (
      <div
        className={`${className ?? ""} relative overflow-hidden flex items-center justify-center`}
        aria-label="Globe terrestre"
      >
        <style>{`
          @keyframes fcdor-globe-spin { from { background-position: 0 0; } to { background-position: -640px 0; } }
          @keyframes fcdor-globe-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes fcdor-pulse { 0%,100% { opacity:.55; transform: scale(1);} 50% { opacity:1; transform: scale(1.35);} }
          .fcdor-globe-wrap { width: min(82%, 420px); aspect-ratio: 1/1; position: relative; animation: fcdor-globe-float 6s ease-in-out infinite; }
          .fcdor-globe-sphere {
            position: absolute; inset: 0; border-radius: 50%;
            background:
              radial-gradient(circle at 30% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 38%),
              url("https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg");
            background-size: 200% 100%, 200% 100%;
            background-repeat: no-repeat, repeat-x;
            box-shadow:
              inset -22px -22px 48px rgba(0,0,0,.55),
              inset 18px 18px 48px rgba(120,180,255,.18),
              0 0 60px rgba(78,196,255,.45),
              0 0 120px rgba(78,196,255,.25);
            animation: fcdor-globe-spin 38s linear infinite;
          }
          .fcdor-globe-clouds {
            position: absolute; inset: -2%; border-radius: 50%; pointer-events: none;
            background: url("https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/fair_clouds_4k.png");
            background-size: 200% 100%; opacity:.45; mix-blend-mode: screen;
            animation: fcdor-globe-spin 28s linear infinite reverse;
            -webkit-mask-image: radial-gradient(circle, #000 60%, transparent 72%);
                    mask-image: radial-gradient(circle, #000 60%, transparent 72%);
          }
          .fcdor-globe-atm {
            position: absolute; inset: -8%; border-radius: 50%; pointer-events: none;
            background: radial-gradient(circle, rgba(78,196,255,0) 55%, rgba(78,196,255,.45) 66%, rgba(78,196,255,0) 78%);
            filter: blur(2px);
          }
          .fcdor-stars {
            position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
            background-image:
              radial-gradient(1px 1px at 12% 18%, #fff, transparent 60%),
              radial-gradient(1px 1px at 82% 22%, #fff, transparent 60%),
              radial-gradient(1.5px 1.5px at 28% 78%, #fff, transparent 60%),
              radial-gradient(1px 1px at 65% 88%, #fff, transparent 60%),
              radial-gradient(1px 1px at 90% 60%, #fff, transparent 60%),
              radial-gradient(1px 1px at 5% 55%, #fff, transparent 60%);
            opacity:.7;
          }
        `}</style>
        <div className="fcdor-stars" />
        <div className="fcdor-globe-wrap">
          <div className="fcdor-globe-atm" />
          <div className="fcdor-globe-sphere" />
          <div className="fcdor-globe-clouds" />
          {points.slice(0, 24).map((p, i) => {
            const top = `${50 - (p.lat / 90) * 42}%`;
            const left = `${50 + (p.lon / 180) * 42}%`;
            const color = p.live ? "#fffc22" : (p.color ?? "#22e3ff");
            return (
              <span
                key={`${p.lat}-${p.lon}-${i}`}
                style={{
                  position: "absolute",
                  top, left,
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 10px ${color}, 0 0 22px ${color}`,
                  transform: "translate(-50%,-50%)",
                  animation: `fcdor-pulse ${1.2 + (i % 5) * 0.3}s ease-in-out infinite`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return <div ref={mountRef} className={className} />;
};

export default RealisticGlobe;
