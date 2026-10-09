'use client';

import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import type * as THREE from 'three';
import styles from './cogniva-world.module.css';

type Feature = 'notes' | 'tasks' | 'focus';
type Props = { experience?: 'landing' | 'login' | 'register'; theme?: 'light' | 'dark'; progress?: MotionValue<number>; paused?: boolean; onSelect?: (id: Feature) => void };

/** A small, self-contained WebGL scene. The rest of the page is usable before it loads. */
export default function CognivaWorld({ progress, paused = false, onSelect, theme = 'light', experience = 'landing' }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  const pause = useRef(paused);
  const wake = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  useEffect(() => { select.current = onSelect; }, [onSelect]);
  useEffect(() => { pause.current = paused; wake.current(); }, [paused]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let teardown = () => {};
    void import('three').then((T) => {
      if (disposed) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
      catch { return; }
      const textures: THREE.Texture[] = [];
      const scene = new T.Scene();
      renderer.setClearColor(0xf6f5ee, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.28;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      container.appendChild(renderer.domElement);
      const camera = new T.OrthographicCamera(-5, 5, 4.5, -4.5, 0.1, 80);
      const world = new T.Group();
      scene.add(world);
      scene.add(new T.HemisphereLight(0xfffcf0, 0x829181, 3));
      const key = new T.DirectionalLight(0xfff6df, 4.5); key.position.set(-5, 10, 8); scene.add(key);
      const fill = new T.DirectionalLight(0xcbded8, 1.6); fill.position.set(7, 4, -4); scene.add(fill);
      const mat = (color: number, roughness = 0.55, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
      const cream = mat(0xf4f0db), paper = mat(0xfffdf3), green = mat(0x193d32), sage = mat(0x9cb895), lime = mat(0xd7ed98), orange = mat(0xef8554), gold = mat(0xc4a566, .3, .5);
      function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
        const m = new T.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); return m;
      }
      function disk(parent: THREE.Object3D, radius: number, height: number, material: THREE.Material, x: number, y: number, z: number) {
        return mesh(new T.CylinderGeometry(radius, radius * .98, height, 80, 1), material, parent, x, y, z);
      }
      function rounded(w: number, h: number, depth: number, radius = .1) {
        const s = new T.Shape(); const x = -w / 2, y = -h / 2, r = Math.min(radius, w / 2, h / 2);
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        return new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 10 });
      }
      const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
      const sc = shadowCanvas.getContext('2d');
      if (sc) { const gradient = sc.createRadialGradient(64, 64, 1, 64, 64, 64); gradient.addColorStop(0, 'rgba(38,57,41,.29)'); gradient.addColorStop(.4, 'rgba(38,57,41,.15)'); gradient.addColorStop(1, 'rgba(38,57,41,0)'); sc.fillStyle = gradient; sc.fillRect(0, 0, 128, 128); }
      const shadowTexture = new T.CanvasTexture(shadowCanvas); textures.push(shadowTexture);
      function shadow(parent: THREE.Object3D, size: number, x: number, y: number, z: number, opacity = 1) {
        const m = mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity }), parent, x, y, z); m.rotation.x = -Math.PI / 2; return m;
      }
      shadow(world, 10, 0, -.68, 0, .65);
      const notes = new T.Group(); notes.userData.feature = 'notes'; notes.position.set(-.2, 0, .2); world.add(notes);
      disk(notes, 2.45, .34, cream, 0, -.26, 0);
      disk(notes, 2.29, .07, sage, 0, -.045, 0);
      disk(notes, 1.96, .15, cream, 0, .05, 0);
      shadow(notes, 4, 0, .132, 0, .9);
      // A sculptural arch frames the book and gives the scene its silhouette.
      const arch = mesh(new T.TorusGeometry(1.74, .18, 16, 84, Math.PI * 1.52), theme === 'dark' ? sage : green, notes, 0, 1.52, -.85);
      arch.rotation.z = -.26 * Math.PI;
      const innerArch = mesh(new T.TorusGeometry(1.74, .025, 8, 80, Math.PI * .98), lime, notes, 0, 1.52, -.64); innerArch.rotation.z = .01;
      const book = new T.Group(); book.position.set(0, .65, .4); book.rotation.set(.06, -.13, -.06); notes.add(book);
      const bookHalves: THREE.Group[] = [];
      // Two hinged covers, layered page edges and curved paper surfaces.
      for (const side of [-1, 1]) {
        const half = new T.Group(); half.rotation.z = side * -.12; book.add(half); bookHalves.push(half);
        const cover = mesh(rounded(1.42, 1.95, .10, .06), green, half, side * .73, -.1, 0); cover.rotation.x = -Math.PI / 2;
        for (let layer = 0; layer < 6; layer++) {
          const page = mesh(new T.BoxGeometry(1.31, .018, 1.8), layer % 2 ? paper : cream, half, side * .73, .04 + layer * .031, -.01);
          page.rotation.z = side * layer * -.008;
        }
        const geo = new T.PlaneGeometry(1.33, 1.81, 24, 1); geo.rotateX(-Math.PI / 2);
        const positions = geo.attributes.position;
        for (let i = 0; i < positions.count; i++) { const px = positions.getX(i); positions.setY(i, .23 + Math.sin((px / 1.33 + .5) * Math.PI) * .105); }
        geo.computeVertexNormals();
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#fffdf3'; ctx.fillRect(0, 0, 512, 640);
          ctx.fillStyle = '#244e3e'; ctx.fillRect(56, 75, 220, 9);
          if (side < 0) {
            ctx.fillStyle = '#e9edd8'; ctx.fillRect(56, 139, 395, 205);
            ctx.strokeStyle = '#75916a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(253, 239, 65, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(253, 239, 108, 32, -.6, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#ec8657'; ctx.beginPath(); ctx.arc(253, 239, 16, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = '#d7ed98'; ctx.fillRect(53, 179, 399, 31);
            ctx.strokeStyle = '#90a08a'; ctx.lineWidth = 3;
            for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(57, 159 + i * 39); ctx.lineTo(440 - (i % 3) * 38, 159 + i * 39); ctx.stroke(); }
          }
          ctx.strokeStyle = '#b6b9a5'; ctx.lineWidth = 3;
          for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(57, 394 + i * 32); ctx.lineTo(445 - (i % 3) * 32, 394 + i * 32); ctx.stroke(); }
          
        }
        const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4); textures.push(texture);
        mesh(geo, new T.MeshStandardMaterial({ map: texture, roughness: .85, side: T.DoubleSide }), half, side * .73, 0, 0);
      }
      const bookmark = mesh(new T.BoxGeometry(.13, .025, .67), orange, book, .24, -.025, 1.06); bookmark.rotation.y = -.14;
      // Pencil made from a hexagonal barrel, wooden tip, graphite and brass collar.
      const pencil = new T.Group(); notes.add(pencil); pencil.position.set(1.65, .7, .67); pencil.rotation.set(.2, 0, -.55);
      mesh(new T.CylinderGeometry(.075, .075, 1.65, 6), orange, pencil);
      mesh(new T.ConeGeometry(.075, .27, 6), cream, pencil, 0, -.96, 0).rotation.z = Math.PI;
      mesh(new T.ConeGeometry(.032, .10, 6), green, pencil, 0, -1.12, 0).rotation.z = Math.PI;
      mesh(new T.CylinderGeometry(.081, .081, .16, 16), gold, pencil, 0, .82, 0);
      mesh(new T.CylinderGeometry(.079, .079, .15, 16), cream, pencil, 0, .97, 0);
      const tasks = new T.Group(); tasks.userData.feature = 'tasks'; tasks.position.set(-2.75, .45, -.45); world.add(tasks);
      disk(tasks, 1.0, .22, sage, 0, -.3, 0); disk(tasks, .91, .07, lime, 0, -.155, 0); shadow(tasks, 1.8, 0, -.115, 0);
      const cards = new T.Group(); cards.rotation.set(-.14, .3, -.12); tasks.add(cards);
      mesh(rounded(1.32, 1.75, .07), sage, cards, .11, .96, -.17).rotation.z = -.12;
      mesh(rounded(1.32, 1.75, .09), paper, cards, 0, 1, 0);
      for (let i = 0; i < 3; i++) {
        mesh(rounded(.20, .20, .015, .045), i === 0 ? green : lime, cards, -.40, 1.38 - i * .36, .115);
        mesh(new T.BoxGeometry(.58 - i * .07, .045, .016), i === 0 ? sage : cream, cards, .14, 1.38 - i * .36, .13);
      }
      mesh(new T.BoxGeometry(.65, .07, .02), green, cards, -.18, 1.70, .13);
      const focus = new T.Group(); focus.userData.feature = 'focus'; focus.position.set(2.62, -.03, 1.12); world.add(focus);
      disk(focus, 1.03, .30, cream, 0, -.21, 0); disk(focus, .94, .05, lime, 0, -.025, 0); shadow(focus, 1.9, 0, .008, 0);
      const timer = new T.Group(); timer.rotation.set(-.1, -.1, .1); timer.position.set(0, .80, 0); focus.add(timer);
      const housing = mesh(new T.CylinderGeometry(.68, .68, .29, 64), green, timer); housing.rotation.x = Math.PI / 2;
      const dial = mesh(new T.CylinderGeometry(.59, .59, .025, 64), cream, timer, 0, 0, .16); dial.rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const tick = mesh(new T.BoxGeometry(.026, i % 3 === 0 ? .11 : .055, .016), green, timer, Math.sin(a) * .49, Math.cos(a) * .49, .185); tick.rotation.z = -a; }
      const hand = mesh(new T.BoxGeometry(.045, .35, .025), orange, timer, -.07, .12, .2); hand.rotation.z = .5;
      mesh(new T.SphereGeometry(.053, 16, 12), orange, timer, 0, 0, .21);
      mesh(new T.CylinderGeometry(.14, .14, .1, 24), orange, timer, 0, .70, 0);
      const orb = mesh(new T.SphereGeometry(.28, 28, 20), orange, world, 2.38, 2.7, -.72);
      const pebble = new T.Group(); pebble.position.set(-1.83, .13, 1.6); world.add(pebble);
      for (let i = 0; i < 3; i++) { const p = mesh(new T.SphereGeometry(.32 - i * .05, 24, 16), i === 1 ? green : cream, pebble, i * .025, i * .20, 0); p.scale.set(1.2, .43, .85); }
      const spark = mesh(new T.OctahedronGeometry(.18, 0), lime, world, -1.95, 3.3, -.3); spark.rotation.z = .3;
      const authScene = experience !== 'landing';
      const loginScene = experience === 'login';
      if (loginScene) {
        notes.visible = false; tasks.visible = false; pencil.visible = false; pebble.visible = false; spark.visible = false;
        focus.scale.setScalar(1.8);
        const halo = mesh(new T.TorusGeometry(2.18, .23, 16, 84, Math.PI * 1.68), sage, world, 0, 1.48, -.95);
        halo.rotation.set(0, -.12, -.4);
        const smallBook = book.clone(); smallBook.position.set(-2.0, .22, .75); smallBook.scale.setScalar(.65); smallBook.rotation.set(.04, .35, -.04); world.add(smallBook);
        disk(world, 1.05, .22, cream, -2.0, -.13, .75);
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let inView = true, frame = 0, px = 0, py = 0, sx = 0, sy = 0, targetScroll = progress?.get() ?? 0, scroll = targetScroll;
      let last = 0, width = 1, height = 1, elapsed = 0;
      const pointer = new T.Vector2(); const raycaster = new T.Raycaster();
      const aim = new T.Vector3(0, 1.12, 0);
      function render(time: number) {
        frame = 0;
        if (disposed || !inView || document.hidden) return;
        const dt = Math.min((time - last) / 1000, .05); last = time;
        const pointerFactor = 1 - Math.exp(-dt * 9);
        const scrollFactor = 1 - Math.exp(-dt * 22);
        const moving = !reduced.matches && !pause.current;
        if (moving && authScene) elapsed += dt;
        const entrance = authScene && !reduced.matches ? 1 - Math.pow(1 - Math.min(elapsed / 1.6, 1), 3) : 1;
        const drift = authScene && !reduced.matches ? Math.sin(elapsed * .55) : 0;
        sx += ((moving ? px : 0) - sx) * pointerFactor; sy += ((moving ? py : 0) - sy) * pointerFactor;
        scroll += ((moving ? Math.min(targetScroll, 1) : 0) - scroll) * scrollFactor;
        world.rotation.y = -.13 + scroll * .65 + sx * .09 + (authScene ? drift * .065 : 0);
        world.scale.setScalar(authScene ? .9 + entrance * .1 : 1);
        world.position.y = authScene ? (1 - entrance) * -.4 : 0;
        world.rotation.x = sy * .035;
        notes.position.y = -scroll * .3 + (authScene ? drift * .07 : 0);
        if (authScene) bookHalves.forEach((half, index) => { half.rotation.z = (index ? 1 : -1) * (-.12 - (1 - entrance) * .3); });
        tasks.position.x = -2.75 - scroll * .4; tasks.position.y = .45 + scroll * 1.2 + (authScene ? .4 + Math.sin(elapsed * .65 + .8) * .13 : 0);
        if (authScene) cards.rotation.z = -.12 + Math.sin(elapsed * .45) * .03;
        focus.position.x = loginScene ? .4 : 2.62 + scroll * .5; focus.position.y = loginScene ? .02 + drift * .09 : -.03 + scroll * .65 + (authScene ? Math.sin(elapsed * .6 + 2) * .11 : 0);
        if (authScene) timer.rotation.z = .1 + drift * .035;
        orb.position.y = 2.7 + scroll * .65 + (authScene ? Math.sin(elapsed * .45) * .17 : 0);
        camera.position.set(6.6 + sx * .35, 5.3 + sy * .3, 10); camera.lookAt(aim);
        renderer.render(scene, camera);
        if ((authScene && moving) || Math.abs(px * (moving ? 1 : 0) - sx) + Math.abs(py * (moving ? 1 : 0) - sy) + Math.abs((moving ? targetScroll : 0) - scroll) > .001) frame = requestAnimationFrame(render);
      }
      function requestRender() { if (!frame && !disposed && inView && !document.hidden) { last = performance.now() - 16; frame = requestAnimationFrame(render); } }
      wake.current = requestRender;
      function resize() {
        width = container!.clientWidth; height = container!.clientHeight;
        if (!width || !height) return;
        const aspect = width / height, vertical = aspect < 1 ? 4.65 / aspect : 4.15;
        camera.left = -vertical * aspect; camera.right = vertical * aspect; camera.top = vertical; camera.bottom = -vertical; camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5));
        renderer.setSize(width, height); requestRender();
      }
      function pick(event: PointerEvent) {
        const rect = container!.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const intersections = raycaster.intersectObjects([notes, tasks, focus], true);
        for (const hit of intersections) { let object: THREE.Object3D | null = hit.object; while (object) { if (object.userData.feature) return object.userData.feature as Feature; object = object.parent; } }
        return undefined;
      }
      function pointerMove(event: PointerEvent) { if (event.pointerType === 'touch') return; const rect = container!.getBoundingClientRect(); px = ((event.clientX - rect.left) / rect.width - .5) * 2; py = ((event.clientY - rect.top) / rect.height - .5) * 2; container!.style.cursor = select.current && pick(event) ? 'pointer' : 'default'; requestRender(); }
      function pointerLeave() { px = py = 0; container!.style.cursor = select.current ? 'grab' : 'default'; requestRender(); }
      let downX = 0, downY = 0;
      function pointerDown(event: PointerEvent) { downX = event.clientX; downY = event.clientY; }
      function pointerUp(event: PointerEvent) { if (Math.hypot(event.clientX - downX, event.clientY - downY) > 8) return; const feature = pick(event); if (feature) select.current?.(feature); }
      const ro = new ResizeObserver(resize); ro.observe(container);
      const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) requestRender(); else { cancelAnimationFrame(frame); frame = 0; } }); io.observe(container);
      const unsubscribe = progress?.on('change', (value) => { targetScroll = Math.max(0, Math.min(1, value)); requestRender(); });
      container.addEventListener('pointermove', pointerMove); container.addEventListener('pointerleave', pointerLeave); container.addEventListener('pointerdown', pointerDown); container.addEventListener('pointerup', pointerUp);
      document.addEventListener('visibilitychange', requestRender); reduced.addEventListener('change', requestRender);
      resize(); setReady(true);
      teardown = () => {
        cancelAnimationFrame(frame); unsubscribe?.(); ro.disconnect(); io.disconnect();
        container.removeEventListener('pointermove', pointerMove); container.removeEventListener('pointerleave', pointerLeave); container.removeEventListener('pointerdown', pointerDown); container.removeEventListener('pointerup', pointerUp);
        document.removeEventListener('visibilitychange', requestRender); reduced.removeEventListener('change', requestRender);
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
        scene.traverse(object => { if (object instanceof T.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); } });
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove(); wake.current = () => {};
      };
    }).catch(() => { /* The illustrated fallback remains usable when WebGL is unavailable. */ });
    return () => { disposed = true; teardown(); };
  }, [progress, theme, experience]);

  return <div className={styles.world} ref={host} role="img" aria-label="Pulau belajar tiga dimensi: buku terbuka, kartu tugas, dan timer fokus. Gunakan pilihan demo di bawah untuk menjelajahi fitur.">
    {!ready && <div className={styles.fallback} aria-hidden="true"><svg viewBox="0 0 800 650" fill="none"><ellipse cx="410" cy="526" rx="264" ry="50" fill="#193d32" opacity=".08"/><ellipse cx="402" cy="470" rx="220" ry="91" fill="#dedfc9"/><ellipse cx="402" cy="450" rx="220" ry="91" fill="#d7ed98"/><path d="M260 364V268a144 144 0 0 1 288 0v96" stroke="#193d32" strokeWidth="32"/><path d="m252 385 151 47 154-79-151-39-154 71Z" fill="#193d32"/><path d="m255 368 147 40 148-74-141-38-154 72Z" fill="#fffdf3"/><path d="m402 407 7-111" stroke="#cbd0b5" strokeWidth="3"/><rect x="150" y="272" width="109" height="143" rx="12" fill="#f1ecd9" transform="rotate(-12 150 272)"/><path d="m176 301 52-11m-47 38 52-11m-46 36 52-11" stroke="#9cb895" strokeWidth="8"/><circle cx="611" cy="423" r="60" fill="#193d32"/><circle cx="611" cy="423" r="48" fill="#f4f0db"/><path d="M611 390v34l19 12" stroke="#ef8554" strokeWidth="6" strokeLinecap="round"/><circle cx="585" cy="212" r="23" fill="#ef8554"/></svg></div>}
  </div>;
}
