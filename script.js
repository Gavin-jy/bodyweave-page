const demoVideo = document.querySelector('#demo-video');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

if (demoVideo && !motionPreference.matches && !navigator.connection?.saveData) {
  demoVideo.muted = true;
  demoVideo.play().catch(() => {});
}

motionPreference.addEventListener('change', (event) => {
  if (event.matches) demoVideo?.pause();
});

const viewer = document.querySelector('#garment-viewer');
const loadButton = document.querySelector('#load-model');
const poster = document.querySelector('#model-poster');
const modelStatus = document.querySelector('#model-status');
const bodyButton = document.querySelector('#toggle-body');
const materialButton = document.querySelector('#toggle-material');
const rotationButton = document.querySelector('#toggle-rotation');
const resetButton = document.querySelector('#reset-camera');
const loadingOverlay = document.querySelector('#model-loading');
const modelProgress = document.querySelector('#model-progress');
const cameraButtons = [...document.querySelectorAll('[data-camera]')];
const models = {
  sport: { title: 'Bea' },
  suit: { title: 'Gwen' },
  layered: { title: 'Zelda' },
  qipao: { title: 'Chun-Li', revision: 'appendix-20261124' },
  coat: { title: 'Dabi', revision: 'appendix-20261124' },
  gown: { title: 'Gentiana' },
  pilot: { title: 'D.Va' },
  haman: { title: 'Haman Karn' },
  android21: { title: 'Android 21' },
  ayane: { title: 'Ayane' },
  bowsette: { title: 'Bowsette' },
  ela: { title: 'Ela' },
  juliet: { title: 'Juliet Starling' },
  kula: { title: 'Kula', revision: 'appendix-20261124' },
  luong: { title: 'Luong' },
  marie: { title: 'Marie' },
  wangyi: { title: 'Wang Yi' },
  asta: { title: 'Asta' },
  denki: { title: 'Denki Kaminari' },
  izuku: { title: 'Izuku Midoriya' },
};
let selectedModel = 'sport';
let viewerImport;
let materialDefaults = [];
let loadingTimeout;
let loadRequest = 0;
let retryModel = false;

function setControlsEnabled(enabled) {
  for (const button of [bodyButton, materialButton, rotationButton, resetButton, ...cameraButtons]) {
    button.disabled = !enabled;
  }
}

function resetDisplay() {
  materialDefaults = [];
  bodyButton.setAttribute('aria-pressed', 'true');
  materialButton.setAttribute('aria-pressed', 'false');
  rotationButton.setAttribute('aria-pressed', 'false');
  document.querySelector('#rotation-label').textContent = 'Auto-rotate';
  viewer.removeAttribute('auto-rotate');
  viewer.cameraOrbit = '0deg 80deg 105%';
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = '30deg';
  setControlsEnabled(false);
}

function showModelError() {
  loadingOverlay.hidden = true;
  retryModel = true;
  clearTimeout(loadingTimeout);
  viewer.hidden = true;
  poster.hidden = false;
  loadButton.hidden = false;
  loadButton.disabled = false;
  loadButton.textContent = 'Retry 3D preview ↗';
  modelStatus.textContent = 'The 3D preview could not load. You can still view the rendered result or try again.';
  setControlsEnabled(false);
}

async function loadModel() {
  const request = ++loadRequest;
  loadButton.disabled = true;
  loadButton.textContent = 'Loading 3D…';
  loadingOverlay.hidden = false;
  modelProgress.removeAttribute('value');
  modelStatus.textContent = `Loading ${models[selectedModel].title.toLowerCase()}…`;
  clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(showModelError, 60000);
  try {
    viewerImport ??= import('./vendor/model-viewer.min.js').catch((error) => {
      viewerImport = undefined;
      throw error;
    });
    await viewerImport;
    if (request !== loadRequest) return;
    customElements.get('model-viewer').modelCacheSize = 1;
    customElements.get('model-viewer').minimumRenderScale = 1;
    viewer.removeAttribute('src');
    await viewer.updateComplete;
    if (request !== loadRequest) return;
    viewer.hidden = false;
    poster.hidden = false;
    viewer.alt = `Interactive BodyWeave ${models[selectedModel].title.toLowerCase()} on its target body`;
    const parameters = new URLSearchParams();
    if (models[selectedModel].revision) parameters.set('v', models[selectedModel].revision);
    if (retryModel) parameters.set('retry', request);
    viewer.src = `assets/models/${selectedModel}.glb${parameters.size ? `?${parameters}` : ''}`;
  } catch {
    if (request === loadRequest) showModelError();
  }
}

loadButton.addEventListener('click', loadModel);
viewer.addEventListener('load', () => {
  loadingOverlay.hidden = true;
  retryModel = false;
  clearTimeout(loadingTimeout);
  resetDisplay();
  materialDefaults = viewer.model.materials.map((material) => ({
    material,
    alphaMode: material.getAlphaMode(),
    color: [...material.pbrMetallicRoughness.baseColorFactor],
    texture: material.pbrMetallicRoughness.baseColorTexture?.texture,
    metallic: material.pbrMetallicRoughness.metallicFactor,
    roughness: material.pbrMetallicRoughness.roughnessFactor,
  }));
  viewer.hidden = false;
  poster.hidden = true;
  loadButton.hidden = true;
  loadButton.disabled = false;
  setControlsEnabled(true);
  modelStatus.textContent = 'Drag to rotate · Scroll or pinch to zoom · Toggle the body or inspect geometry';
});
viewer.addEventListener('error', showModelError);
viewer.addEventListener('progress', (event) => {
  modelProgress.value = event.detail.totalProgress;
});

for (const button of document.querySelectorAll('[data-model]')) {
  button.addEventListener('click', () => {
    if (selectedModel === button.dataset.model) return;
    selectedModel = button.dataset.model;
    loadingOverlay.hidden = true;
    retryModel = false;
    ++loadRequest;
    clearTimeout(loadingTimeout);
    resetDisplay();
    viewer.removeAttribute('src');
    viewer.hidden = true;
    poster.src = `assets/models/${selectedModel}-oblique.webp`;
    poster.alt = `Rendered BodyWeave ${models[selectedModel].title.toLowerCase()} on its target body`;
    poster.hidden = false;
    const reference = document.querySelector('#model-reference');
    reference.src = `assets/models/${selectedModel}-input.webp`;
    reference.alt = `Front reference image for the ${models[selectedModel].title.toLowerCase()}`;
    document.querySelector('#model-title').textContent = models[selectedModel].title;
    for (const choice of document.querySelectorAll('[data-model]')) {
      choice.setAttribute('aria-pressed', String(choice === button));
    }
    loadButton.hidden = false;
    loadButton.disabled = false;
    loadButton.textContent = 'Explore in 3D ↗';
    modelStatus.textContent = 'Select Explore in 3D to rotate and inspect this garment.';
    const choices = [...document.querySelectorAll('[data-model]')];
    document.querySelector('#case-position').textContent = `${String(choices.indexOf(button) + 1).padStart(2, '0')} / ${choices.length} · ${models[selectedModel].title}`;
    const strip = document.querySelector('.model-choices');
    if (strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2, behavior: motionPreference.matches ? 'instant' : 'smooth' });
    }
  });
}

for (const [selector, direction] of [['#previous-case', -1], ['#next-case', 1]]) {
  document.querySelector(selector).addEventListener('click', () => {
    const choices = [...document.querySelectorAll('[data-model]')];
    const current = choices.findIndex((button) => button.dataset.model === selectedModel);
    choices[(current + direction + choices.length) % choices.length].click();
  });
}
for (const button of cameraButtons) {
  button.addEventListener('click', () => {
    viewer.removeAttribute('auto-rotate');
    rotationButton.setAttribute('aria-pressed', 'false');
    document.querySelector('#rotation-label').textContent = 'Auto-rotate';
    viewer.resetTurntableRotation();
    viewer.cameraOrbit = `${button.dataset.camera}deg 80deg 105%`;
  });
}
const studio = document.querySelector('#model-studio');
const expandButton = document.querySelector('#fullscreen-model');
function setExpanded(expanded) {
  studio.classList.toggle('is-expanded', expanded);
  document.body.classList.toggle('model-expanded', expanded);
  expandButton.setAttribute('aria-pressed', String(expanded));
  expandButton.textContent = expanded ? 'Restore ↙' : 'Expand ⤢';
  for (const child of document.querySelector('main').children) {
    if (!child.contains(studio)) child.inert = expanded;
  }
  for (const child of document.querySelector('#interactive').children) {
    if (child !== studio) child.inert = expanded;
  }
  document.querySelector('footer').inert = expanded;
  if (expanded) expandButton.focus();
}
expandButton.addEventListener('click', () => setExpanded(!studio.classList.contains('is-expanded')));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && studio.classList.contains('is-expanded')) setExpanded(false);
});

bodyButton.addEventListener('click', () => {
  const visible = bodyButton.getAttribute('aria-pressed') !== 'true';
  for (const entry of materialDefaults.filter((entry) => entry.material.name !== 'Garment')) {
    entry.material.setAlphaMode(visible ? entry.alphaMode : 'BLEND');
    entry.material.pbrMetallicRoughness.setBaseColorFactor([...entry.color.slice(0, 3), visible ? entry.color[3] : 0]);
  }
  bodyButton.setAttribute('aria-pressed', String(visible));
});

materialButton.addEventListener('click', () => {
  const geometryOnly = materialButton.getAttribute('aria-pressed') !== 'true';
  for (const entry of materialDefaults.filter((entry) => entry.material.name === 'Garment')) {
    const surface = entry.material.pbrMetallicRoughness;
    surface.baseColorTexture?.setTexture(geometryOnly ? null : entry.texture);
    surface.setBaseColorFactor(geometryOnly ? [0.42, 0.65, 0.72, 1] : entry.color);
    surface.setMetallicFactor(geometryOnly ? 0 : entry.metallic);
    surface.setRoughnessFactor(geometryOnly ? 1 : entry.roughness);
  }
  materialButton.setAttribute('aria-pressed', String(geometryOnly));
});

rotationButton.addEventListener('click', () => {
  const rotate = rotationButton.getAttribute('aria-pressed') !== 'true';
  viewer.autoRotateDelay = 0;
  viewer.rotationPerSecond = '25deg';
  viewer.toggleAttribute('auto-rotate', rotate);
  rotationButton.setAttribute('aria-pressed', String(rotate));
  document.querySelector('#rotation-label').textContent = rotate ? 'Pause rotation' : 'Auto-rotate';
});
resetButton.addEventListener('click', () => {
  viewer.cameraOrbit = '0deg 80deg 105%';
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = '30deg';
  viewer.resetTurntableRotation();
});
motionPreference.addEventListener('change', (event) => {
  if (event.matches) {
    viewer.removeAttribute('auto-rotate');
    rotationButton.setAttribute('aria-pressed', 'false');
    document.querySelector('#rotation-label').textContent = 'Auto-rotate';
  }
});

const figureDialog = document.querySelector('#figure-dialog');
const sheets = {
  'geometry-gw': { title: 'Geometric reconstruction on GarmentWeave3D', height: 3076 },
  'geometry-artist': { title: 'Geometric reconstruction on Artist-Created Garments', height: 3125 },
  'materials-gw': { title: 'Appearance synthesis on GarmentWeave3D', height: 3127 },
  'materials-artist': { title: 'Appearance synthesis on Artist-Created Garments', height: 3139 },
};
for (const button of document.querySelectorAll('[data-sheet]')) {
  button.addEventListener('click', () => {
    const sheet = sheets[button.dataset.sheet];
    const source = `assets/${button.dataset.sheet}.webp`;
    const picture = document.querySelector('#gallery-image');
    picture.src = source;
    picture.alt = sheet.title;
    picture.height = sheet.height;
    document.querySelector('#gallery-link').href = source;
    document.querySelector('#gallery-caption').textContent = `${sheet.title}. Select the figure to enlarge.`;
    for (const choice of document.querySelectorAll('[data-sheet]')) {
      choice.setAttribute('aria-pressed', String(choice === button));
    }
  });
}
const enlargedFigure = document.querySelector('#enlarged-figure');
const figureViewport = document.querySelector('#figure-viewport');
let figureScale = 1;
let figureFit = true;
function setFigureScale(scale, fit = false) {
  if (!enlargedFigure.naturalWidth) return;
  const previousWidth = enlargedFigure.clientWidth || 1;
  const centerX = (figureViewport.scrollLeft + figureViewport.clientWidth / 2) / previousWidth;
  const centerY = (figureViewport.scrollTop + figureViewport.clientHeight / 2) / previousWidth;
  figureFit = fit;
  figureScale = fit ? Math.min(1, (figureViewport.clientWidth - 32) / enlargedFigure.naturalWidth) : Math.min(3, Math.max(0.1, scale));
  const width = Math.round(enlargedFigure.naturalWidth * figureScale);
  enlargedFigure.style.width = `${width}px`;
  document.querySelector('#figure-zoom-label').textContent = `${Math.round(figureScale * 100)}%`;
  figureViewport.scrollLeft = fit ? 0 : centerX * width - figureViewport.clientWidth / 2;
  figureViewport.scrollTop = fit ? 0 : centerY * width - figureViewport.clientHeight / 2;
}
enlargedFigure.addEventListener('load', () => setFigureScale(1, true));
document.querySelector('#zoom-in').addEventListener('click', () => setFigureScale(figureScale * 1.4));
document.querySelector('#zoom-out').addEventListener('click', () => setFigureScale(figureScale / 1.4));
document.querySelector('#zoom-fit').addEventListener('click', () => setFigureScale(1, true));
document.querySelector('#zoom-original').addEventListener('click', () => setFigureScale(1));
window.addEventListener('resize', () => {
  if (figureDialog.open && figureFit) setFigureScale(1, true);
});
let figureDrag;
figureViewport.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  figureDrag = { x: event.clientX, y: event.clientY, left: figureViewport.scrollLeft, top: figureViewport.scrollTop };
  figureViewport.setPointerCapture(event.pointerId);
  figureViewport.classList.add('is-dragging');
  event.preventDefault();
});
figureViewport.addEventListener('pointermove', (event) => {
  if (!figureDrag) return;
  figureViewport.scrollLeft = figureDrag.left - event.clientX + figureDrag.x;
  figureViewport.scrollTop = figureDrag.top - event.clientY + figureDrag.y;
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  figureViewport.addEventListener(eventName, () => {
    figureDrag = undefined;
    figureViewport.classList.remove('is-dragging');
  });
}
for (const link of document.querySelectorAll('figure a[href$=".webp"]')) {
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    enlargedFigure.src = link.href;
    enlargedFigure.alt = link.querySelector('img').alt;
    figureDialog.showModal();
    if (enlargedFigure.complete) setFigureScale(1, true);
  });
}
document.querySelector('#close-figure').addEventListener('click', () => figureDialog.close());
figureDialog.addEventListener('click', (event) => {
  if (event.target === figureDialog) figureDialog.close();
});
