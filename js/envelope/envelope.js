/* Hero envelope flight: scene module.
   Step 2: renderer only — an aria-hidden canvas inside .envelope-stage with
   one transparent frame. The picture stays visible; nothing changes yet.
   Section order follows prototype/proto.js (copied from, never imported). */
export async function start() {
  const stage = document.querySelector('.envelope-stage');
  if (!stage) return;
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  const rect = stage.getBoundingClientRect();
  renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
  stage.appendChild(canvas);
  renderer.render(new THREE.Scene(), new THREE.Camera());
}
