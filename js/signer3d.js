/* voclynx 3D signing avatar — self-hosted Three.js renderer.
 *
 * This file fixes the original 3D failure mode. The first attempt loaded a
 * remote signing engine in an iframe and depended on a third-party research
 * server: when that server never answered, the frame stayed blank and the UI
 * fell back to a flat cutout. This renderer has no remote dependencies at
 * all — no iframe, no CDN script, no model download. The character is built
 * procedurally from Three.js primitives (vendored at /vendor/three.min.js),
 * so the first frame renders even if every network request after page load
 * fails. WebGL is still required; when it is unavailable the engine reports
 * ready:false and the caller falls back to the 2D canvas signer.
 *
 * API (mirrors createSignerEngine in signer.js):
 *   createSigner3DEngine(canvas, avatarName)
 *     -> { ready, is3d:true, setAvatar(name), setLanguage(<pack code>),
 *          play(glosses, holdMs), playMore(glosses, holdMs), stop(), destroy() }
 *   Pack codes come from the sign-language registry (js/sign-languages.js):
 *   asl/bsl/psl have authored data today; other registered packs fingerspell
 *   only, in their own manual alphabet where one is implemented.
 *
 * Gloss tokens: "HELLO" (sign lookup, language-aware), "FS:A" (ASL
 * fingerspell letter), "BFS:A" (BSL two-handed letter), "PSL:A" (PSL letter), "_NEUTRAL"/"_SPELL"
 * (rest / rhythmic fallback). Unknown sign glosses are fingerspelled
 * letter-by-letter so no word is silently dropped.
 *
 * Sign data comes from window.VOCLYNX_SIGNS3D ({asl:{},bsl:{}}) and
 * window.VOCLYNX_FINGERSPELL3D, merged over small honest built-ins below.
 * The data files are authored separately (see js/sign-schema3d.md).
 *
 * Honesty: nothing here is certified sign language. Poses are stylized
 * approximations for communication support, not a qualified interpreter.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* Pure helpers — also exported for Node tests                       */
  /* ---------------------------------------------------------------- */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  // Finger curls: I=index M=middle R=ring P=pinky (0=extended, 1=curled),
  // T=thumb, spread 0..1. 14 engine handshapes (see sign-schema3d.md).
  var HANDSHAPES = {
    flat:   { I: 0,    M: 0,    R: 0,    P: 0,    T: 0.85, spread: 0.55 },
    fist:   { I: 1,    M: 1,    R: 1,    P: 1,    T: 0.9,  spread: 0 },
    point:  { I: 0,    M: 1,    R: 1,    P: 1,    T: 0.9,  spread: 0 },
    two:    { I: 0,    M: 0,    R: 1,    P: 1,    T: 0.9,  spread: 0.8 },
    hook:   { I: 0.55, M: 1,    R: 1,    P: 1,    T: 0.9,  spread: 0 },
    pinch:  { I: 0.7,  M: 0.9,  R: 0.9,  P: 0.9,  T: 0.5,  spread: 0.2 },
    ok:     { I: 0.75, M: 0.15, R: 0.15, P: 0.15, T: 0.6,  spread: 0.2 },
    cup:    { I: 0.35, M: 0.35, R: 0.35, P: 0.35, T: 0.4,  spread: 0.3 },
    bent:   { I: 0.55, M: 0.55, R: 0.55, P: 0.55, T: 0.45, spread: 0.35 },
    splay:  { I: 0,    M: 0,    R: 0,    P: 0,    T: 0.1,  spread: 1 },
    'c-hand': { I: 0.5, M: 0.5, R: 0.5,  P: 0.5,  T: 0.4,  spread: 0.45 },
    'l-hand': { I: 0,  M: 1,    R: 1,    P: 1,    T: 0.15, spread: 0.5 },
    'y-hand': { I: 1,  M: 1,    R: 1,    P: 0,    T: 0.1,  spread: 0.5 },
    'i-hand': { I: 1,  M: 1,    R: 1,    P: 0,    T: 0.9,  spread: 0 },
  };

  // Built-in ASL fingerspelling alphabet (standard handshapes). The data file
  // window.VOCLYNX_FINGERSPELL3D overrides/extends these when present.
  var ASL_LETTERS = {
    A: { I: 1, M: 1, R: 1, P: 1, T: 0.25, spread: 0.2 },
    B: { I: 0, M: 0, R: 0, P: 0, T: 0.85, spread: 0.3 },
    C: { I: 0.55, M: 0.55, R: 0.55, P: 0.55, T: 0.45, spread: 0.4 },
    D: { I: 0, M: 0.9, R: 0.9, P: 0.9, T: 0.75, spread: 0.1 },
    E: { I: 0.9, M: 0.9, R: 0.9, P: 0.9, T: 0.85, spread: 0 },
    F: { I: 0.7, M: 0.1, R: 0.1, P: 0.1, T: 0.55, spread: 0.2 },
    G: { I: 0.35, M: 1, R: 1, P: 1, T: 0.35, spread: 0.1 },
    H: { I: 0.2, M: 0.2, R: 1, P: 1, T: 0.9, spread: 0.1 },
    I: { I: 1, M: 1, R: 1, P: 0, T: 0.9, spread: 0 },
    J: { I: 1, M: 1, R: 1, P: 0, T: 0.9, spread: 0, motion: 'twist' },
    K: { I: 0, M: 0, R: 1, P: 1, T: 0.45, spread: 0.3 },
    L: { I: 0, M: 1, R: 1, P: 1, T: 0.15, spread: 0.5 },
    M: { I: 0.95, M: 0.95, R: 0.95, P: 1, T: 0.9, spread: 0 },
    N: { I: 0.95, M: 0.95, R: 1, P: 1, T: 0.9, spread: 0 },
    O: { I: 0.6, M: 0.6, R: 0.6, P: 0.6, T: 0.6, spread: 0.2 },
    P: { I: 0, M: 0, R: 1, P: 1, T: 0.45, spread: 0.3, wrist: 'down' },
    Q: { I: 0.35, M: 1, R: 1, P: 1, T: 0.35, spread: 0.1, wrist: 'down' },
    R: { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0 },
    S: { I: 1, M: 1, R: 1, P: 1, T: 0.95, spread: 0 },
    T: { I: 1, M: 1, R: 1, P: 1, T: 0.7, spread: 0 },
    U: { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0 },
    V: { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.9 },
    W: { I: 0, M: 0, R: 0, P: 1, T: 0.9, spread: 0.5 },
    X: { I: 0.6, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    Y: { I: 1, M: 1, R: 1, P: 0, T: 0.1, spread: 0.5 },
    Z: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0, motion: 'zdraw' },
  };
  var ASL_DIGITS = {
    '0': { I: 0.6, M: 0.6, R: 0.6, P: 0.6, T: 0.6, spread: 0.2 },
    '1': { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    '2': { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.9 },
    '3': { I: 0, M: 0, R: 0, P: 1, T: 0.9, spread: 0.5 },
    '4': { I: 0, M: 0, R: 0, P: 0, T: 0.9, spread: 0.7 },
    '5': { I: 0, M: 0, R: 0, P: 0, T: 0.1, spread: 1 },
    '6': { I: 0, M: 0, R: 0, P: 0.7, T: 0.6, spread: 0.3 },
    '7': { I: 0, M: 0, R: 0.7, P: 1, T: 0.6, spread: 0.3 },
    '8': { I: 0, M: 0.7, R: 1, P: 1, T: 0.6, spread: 0.2 },
    '9': { I: 0.7, M: 1, R: 1, P: 1, T: 0.55, spread: 0.2 },
  };

  // Built-in core signs (the original ten demo glosses), as 3D waypoints in
  // sign space. Authored conservatively; the data file extends this set.
  var BUILTIN_SIGNS = {
    asl: {
      'HELLO': [
        { h: 'R', p: [0.10, 0.46, 0.16], shape: 'flat', palm: 'fwd', hold: 150 },
        { h: 'R', p: [0.30, 0.46, 0.30], shape: 'flat', palm: 'fwd', hold: 400 },
      ],
      'THANK-YOU': [
        { h: 'R', p: [0, 0.40, 0.14], shape: 'flat', palm: 'fwd', hold: 150, face: 'positive' },
        { h: 'R', p: [0.06, 0.30, 0.32], shape: 'flat', palm: 'down', hold: 400 },
      ],
      'YES': [
        { h: 'R', p: [0.22, 0.22, 0.24], shape: 'fist', palm: 'fwd', hold: 180, face: 'positive' },
        { h: 'R', p: [0.22, 0.13, 0.24], shape: 'fist', palm: 'fwd', hold: 180 },
        { h: 'R', p: [0.22, 0.22, 0.24], shape: 'fist', palm: 'fwd', hold: 300 },
      ],
      'PLEASE': [
        { h: 'R', p: [0, 0.18, 0.16], shape: 'flat', palm: 'fwd', hold: 200, face: 'positive' },
        { h: 'R', p: [0.10, 0.18, 0.16], shape: 'flat', palm: 'fwd', hold: 200 },
        { h: 'R', p: [0, 0.18, 0.16], shape: 'flat', palm: 'fwd', hold: 300 },
      ],
      'SORRY': [
        { h: 'R', p: [0.05, 0.20, 0.15], shape: 'fist', palm: 'in', hold: 220 },
        { h: 'R', p: [-0.05, 0.20, 0.15], shape: 'fist', palm: 'in', hold: 220 },
        { h: 'R', p: [0.05, 0.20, 0.15], shape: 'fist', palm: 'in', hold: 300 },
      ],
      'GOOD': [
        { h: 'R', p: [0.08, 0.42, 0.16], shape: 'flat', palm: 'fwd', hold: 150, face: 'positive' },
        { h: 'B', p: [0.10, 0.16, 0.26], p2: [-0.10, 0.16, 0.24], shape: 'flat', palm: 'down', hold: 400 },
      ],
      'YOU': [
        { h: 'R', p: [0.10, 0.24, 0.20], shape: 'point', palm: 'fwd', hold: 150 },
        { h: 'R', p: [0.10, 0.24, 0.40], shape: 'point', palm: 'fwd', hold: 400 },
      ],
      'NAME': [
        { h: 'R', p: [0.08, 0.48, 0.12], shape: 'two', palm: 'fwd', hold: 180, face: 'question' },
        { h: 'R', p: [0.10, 0.48, 0.12], shape: 'two', palm: 'fwd', hold: 180 },
        { h: 'R', p: [0.08, 0.48, 0.12], shape: 'two', palm: 'fwd', hold: 300 },
      ],
      'MEET': [
        { h: 'B', p: [0.28, 0.20, 0.24], shape: 'point', palm: 'in', hold: 200, face: 'positive' },
        { h: 'B', p: [0.08, 0.20, 0.26], shape: 'point', palm: 'in', hold: 400 },
      ],
      'TIME': [
        { h: 'B', p: [0.02, 0.16, 0.22], p2: [-0.14, 0.14, 0.20], shape: 'point', palm: 'down', hold: 220 },
        { h: 'B', p: [0.02, 0.16, 0.22], p2: [-0.14, 0.14, 0.20], shape: 'point', palm: 'down', hold: 350 },
      ],
    },
    bsl: {},
  };

  /** "HELLO" | "FS:A" | "BFS:A" | "PSL:A" | "_NEUTRAL" | "_SPELL" -> token object. */
  function parseToken(tok) {
    var t = String(tok == null ? '' : tok).toUpperCase();
    if (t.indexOf('BFS:') === 0) return { kind: 'fingerspell', lang: 'bsl', text: t.slice(4) };
    if (t.indexOf('PSL:') === 0) return { kind: 'fingerspell', lang: 'psl', text: t.slice(4) };
    if (t.indexOf('FS:') === 0) return { kind: 'fingerspell', lang: 'asl', text: t.slice(3) };
    if (t === '_NEUTRAL' || t === '_SPELL') return { kind: 'special', name: t };
    return { kind: 'sign', gloss: t };
  }

  function signData() {
    return (typeof window !== 'undefined' && window.VOCLYNX_SIGNS3D) || {};
  }
  function fingerspellData() {
    return (typeof window !== 'undefined' && window.VOCLYNX_FINGERSPELL3D) || {};
  }

  /** Language-aware sign lookup: bsl/psl fall back to asl for untranslated signs. */
  function resolveSign(gloss, lang) {
    var data = signData();
    var asl = data.asl || {};
    var own = (lang && lang !== 'asl' && data[lang]) || {};
    var wp = own[gloss] ? own[gloss] : (asl[gloss] || BUILTIN_SIGNS.asl[gloss]);
    if (wp) return { waypoints: wp, found: true, fallback: (!own[gloss] && (asl[gloss] || BUILTIN_SIGNS.asl[gloss])) ? 'asl' : null };
    var builtinOwn = (lang && BUILTIN_SIGNS[lang]) || {};
    if (builtinOwn[gloss]) return { waypoints: builtinOwn[gloss], found: true, fallback: null };
    return { waypoints: null, found: false };
  }

  /** Fingerspell letter preset: data file overrides built-in ASL. */
  function letterPreset(ch, lang) {
    var c = String(ch || '').toUpperCase();
    var data = fingerspellData();
    if (lang && lang !== 'asl' && data[lang] && data[lang][c]) return { preset: data[lang][c], lang: lang, found: true };
    if (data.asl && data.asl[c]) return { preset: data.asl[c], lang: 'asl', found: true };
    if (/[A-Z]/.test(c) && ASL_LETTERS[c]) return { preset: ASL_LETTERS[c], lang: 'asl', found: true, builtin: true };
    if (/[0-9]/.test(c) && ASL_DIGITS[c]) return { preset: ASL_DIGITS[c], lang: 'asl', found: true, builtin: true };
    return { preset: null, lang: lang, found: false };
  }

  /* ---------------------------------------------------------------- */
  /* Sign-language packs (registry mirror: js/sign-languages.js)       */
  /*                                                                   */
  /* A pack with no authored sign data fingerspells only, using its    */
  /* manual alphabet where one is implemented ('asl-1h' -> the ASL     */
  /* table, 'bsl-2h' -> the BSL table). Packs whose alphabet is not    */
  /* implemented (manualAlphabet: null) cannot fingerspell yet: their  */
  /* letters surface as marked rest beats — never as another           */
  /* language's letters. Nothing here is certified sign language:      */
  /* every pack needs fluent Deaf review before release.               */
  /* ---------------------------------------------------------------- */

  // Alphabet-family fallback, used only when sign-languages.js is not
  // loaded: BANZSL-family packs spell with the two-handed BSL table,
  // ASL-derived NGSL with the one-handed ASL table.
  var FS_FAMILY = { auslan: 'bsl', isl: 'bsl', sasl: 'bsl', ngsl: 'asl' };

  /** Registry entry for a pack code, or null when unknown/unregistered. */
  function packInfo(code) {
    var list = (typeof window !== 'undefined' && window.VOCLYNX_SIGN_LANGUAGES) || null;
    if (list) {
      for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    }
    return null;
  }

  /**
   * Which implemented fingerspell dataset a language spells with:
   * 'asl' | 'bsl' | 'psl', or null when its manual alphabet is not
   * implemented (do not fake another language's letters).
   */
  function fingerspellLangFor(lang) {
    if (lang === 'asl' || lang === 'bsl' || lang === 'psl') return lang;
    var info = packInfo(lang);
    if (info) {
      if (info.manualAlphabet === 'bsl-2h') return 'bsl';
      if (info.manualAlphabet === 'asl-1h') return 'asl';
      return null;
    }
    return FS_FAMILY[lang] || null;
  }

  /** Validate one waypoint against the schema (used by tests + data files). */
  function validateWaypoint(wp) {
    var errs = [];
    if (!wp || typeof wp !== 'object') return ['waypoint must be an object'];
    if (wp.h !== 'R' && wp.h !== 'L' && wp.h !== 'B') errs.push('h must be R, L or B');
    if (!Array.isArray(wp.p) || wp.p.length !== 3 || wp.p.some(function (n) { return typeof n !== 'number' || !isFinite(n); })) {
      errs.push('p must be [x, y, z] numbers');
    } else {
      // Reach check: every target must be within 0.45 m of its shoulder.
      var pairs = wp.h === 'L' ? [[wp.p, [-0.20, 0.30, 0]]]
        : wp.h === 'R' ? [[wp.p, [0.20, 0.30, 0]]]
        : [[wp.p, [0.20, 0.30, 0]], wp.p2 ? [wp.p2, [-0.20, 0.30, 0]] : [[-wp.p[0], wp.p[1], wp.p[2]], [-0.20, 0.30, 0]]];
      pairs.forEach(function (pair) {
        var pt = pair[0], s = pair[1];
        var d = Math.sqrt(Math.pow(pt[0] - s[0], 2) + Math.pow(pt[1] - s[1], 2) + Math.pow(pt[2] - s[2], 2));
        if (d > 0.45) errs.push('target out of reach (>0.45m from shoulder)');
      });
    }
    if (!HANDSHAPES[wp.shape]) errs.push('unknown handshape: ' + wp.shape);
    if (wp.palm && ['fwd', 'down', 'up', 'in', 'out'].indexOf(wp.palm) < 0) errs.push('bad palm: ' + wp.palm);
    if (wp.face && ['neutral', 'question', 'positive', 'emphasis'].indexOf(wp.face) < 0) errs.push('bad face: ' + wp.face);
    return errs;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      HANDSHAPES: HANDSHAPES, ASL_LETTERS: ASL_LETTERS, ASL_DIGITS: ASL_DIGITS,
      BUILTIN_SIGNS: BUILTIN_SIGNS, parseToken: parseToken,
      resolveSign: resolveSign, letterPreset: letterPreset,
      packInfo: packInfo, fingerspellLangFor: fingerspellLangFor,
      validateWaypoint: validateWaypoint, clamp: clamp, lerp: lerp, sstep: sstep,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Browser engine — everything below needs window + THREE            */
  /* ---------------------------------------------------------------- */

  // Realistic signer styling — modeled directly on the reference signing
  // avatars: natural adult men and women with defined faces, styled hair and
  // everyday clothing. Nia = blonde woman in purple tee; Anna = brown-haired
  // woman in black top with badge; Marc = red-haired young man in blue
  // henley; Elias = gray-haired older man in white shirt + maroon vest.
  var AVATARS = {
    nia:   { skin: 0x8a5636, hair: 0x17120e, hairStyle: 'longblack', shirt: 0xe8601c, lip: 0x8a4a3a,
             female: true, sleeve: 'short', mouthScale: 1.1, eye: 0x2a1a10, eyeScale: 1.35, smile: 0.5 },
    anna:  { skin: 0xf3c69e, hair: 0x5a3a22, hairStyle: 'longbrown', shirt: 0x1f6f6b, lip: 0xa85a4e,
             female: true, sleeve: 'long', mouthScale: 1.0, eye: 0x3a5a8a, eyeScale: 1.3 },
    marc:  { skin: 0x7c4a2c, hair: 0x17120e, hairStyle: 'crop', shirt: 0x2e4a7a, lip: 0x7a4636,
             female: false, sleeve: 'long', stubble: 0.10, mouthScale: 1.0, eye: 0x2a1a10, eyeScale: 1.2 },
    elias: { skin: 0xf6cfa8, hair: 0xc9a86a, hairStyle: 'crop', shirt: 0x51606e, lip: 0x9a6050,
             female: false, sleeve: 'long', mouthScale: 1.0, eye: 0x4a6a8a, eyeScale: 1.2 },
  };

  var L1 = 0.28, L2 = 0.26; // upper arm / forearm lengths (m)
  var SHOULDER_Y = 0.30, SHOULDER_X = 0.20;

  function createSigner3DEngine(canvas, avatarName, opts) {
    // The original failure was assuming the renderer would just work. Probe
    // WebGL first; a falsy context means the caller must use the 2D signer.
    if (typeof THREE === 'undefined' || !canvas || typeof canvas.getContext !== 'function') {
      return { ready: false };
    }
    var gl = null;
    try { gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return { ready: false };

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { return { ready: false }; }
    renderer.setPixelRatio(Math.min(typeof window !== 'undefined' && window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6ecdd);
    scene.fog = new THREE.Fog(0xf6ecdd, 2.6, 4.5);

    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 10);
    camera.position.set(0, 0.30, 1.55);
    camera.lookAt(0, 0.25, 0);

    var hemi = new THREE.HemisphereLight(0xffffff, 0x9aa5a1, 0.62);
    scene.add(hemi);
    var key = new THREE.DirectionalLight(0xfff2e0, 0.85);
    key.position.set(0.8, 1.5, 1.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -0.8; key.shadow.camera.right = 0.8;
    key.shadow.camera.top = 1.0; key.shadow.camera.bottom = -0.6;
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xd6e8ff, 0.35);
    fill.position.set(-0.9, 0.5, 0.8);
    scene.add(fill);

    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 32),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.44;
    ground.receiveShadow = true;
    scene.add(ground);

    var avatar = AVATARS[avatarName] || AVATARS.nia;
    // Anime look (demo restyle, 2026-11-18, at the owner's direction):
    // cel shading via MeshToonMaterial with a 4-step gradient map — flat
    // colour bands like a modern anime film, over the same rig and sign
    // animation as the realistic build.
    var gradientMap = new THREE.DataTexture(new Uint8Array([100, 165, 225, 255]), 4, 1, THREE.LuminanceFormat || THREE.RedFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
    function std(color, roughness) {
      return new THREE.MeshToonMaterial({ color: color, gradientMap: gradientMap });
    }
    var mats = {
      skin: std(avatar.skin, 0.72),
      shirt: std(avatar.shirt, 0.85),
      hair: std(avatar.hair, 0.5),
      lip: std(avatar.lip, 0.6),
      white: std(0xffffff, 0.35),
      dark: std(0x241a14, 0.4),
      iris: std(avatar.eye || 0x4a2e1a, 0.35),
      mouthInner: std(0x3a1512, 0.9),
      vest: std(avatar.vest || avatar.shirt, 0.8),
      nostril: std(0x2a1a12, 0.9),
      badgeRed: std(0xb03030, 0.5),
      stubble: new THREE.MeshStandardMaterial({ color: 0x201812, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.0 }),
    };
    var mouthBaseX = 1; // per-avatar mouth width (Nia smiles wider)
    var smileBase = 0; // per-avatar resting smile (Nia)

    var rig = new THREE.Group();
    scene.add(rig);

    function mesh(geo, mat, x, y, z, parent) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true;
      (parent || rig).add(m);
      return m;
    }

    // ---- torso ----
    // Realistic adult torso. Joint positions (SHOULDER_X/Y, L1, L2) are the
    // sign-animation rig and must not move — only the visible flesh changes.
    var torso = new THREE.Group();
    rig.add(torso);
    var outfitG = new THREE.Group(); // collar, vest, badge… rebuilt per avatar
    torso.add(outfitG);
    // Chest: wider at the shoulders, tapering toward the waist.
    var chest = mesh(new THREE.CapsuleGeometry(0.148, 0.30, 6, 14), mats.shirt, 0, -0.04, 0, torso);
    chest.scale.set(1.10, 1, 0.80);
    var pecL = mesh(new THREE.SphereGeometry(0.062, 14, 10), mats.shirt, -0.060, 0.090, 0.075, torso);
    var pecR = mesh(new THREE.SphereGeometry(0.062, 14, 10), mats.shirt, 0.060, 0.090, 0.075, torso);
    // Trapezius: a soft slope from the neck out to the shoulders, merged
    // visually with the shoulder joint spheres below it.
    var trap = mesh(new THREE.SphereGeometry(0.10, 18, 12), mats.shirt, 0, 0.305, 0, torso);
    trap.scale.set(1.85, 0.62, 0.80);
    // Shoulder joint spheres, embedded in the trapezius slope.
    mesh(new THREE.SphereGeometry(0.056, 12, 10), mats.shirt, SHOULDER_X, SHOULDER_Y, 0, torso);
    mesh(new THREE.SphereGeometry(0.056, 12, 10), mats.shirt, -SHOULDER_X, SHOULDER_Y, 0, torso);
    // Neck: runs from inside the trapezius up into the skull.
    mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.14, 12), mats.skin, 0, 0.40, 0, torso);

    // Per-avatar clothing details (collar, henley placket, vest, badge).
    function buildOutfit() {
      while (outfitG.children.length) outfitG.remove(outfitG.children[0]);
      chest.scale.x = avatar.female ? 1.02 : 1.10; // women read slightly narrower
      // Pecs: subtle on everyone, flatter on men.
      if (avatar.female) { pecL.scale.set(1, 0.60, 0.50); pecR.scale.set(1, 0.60, 0.50); }
      else { pecL.scale.set(1, 0.48, 0.36); pecR.scale.set(1, 0.48, 0.36); }
      // Crew-neck collar — skipped for Anna, who wears a patterned camp
      // collar instead (see below).
      if (!avatar.collarPattern) {
        var collar = mesh(new THREE.TorusGeometry(0.060, 0.015, 8, 20), mats.shirt, 0, 0.362, 0.008, outfitG);
        collar.rotation.x = Math.PI / 2 - 0.15;
      } else {
        // Anna's floral camp collar, worn open over the black top.
        var patTex = makeCollarTexture();
        var patMat = new THREE.MeshStandardMaterial({ map: patTex, roughness: 0.85, metalness: 0.0 });
        var inner = mesh(new THREE.BoxGeometry(0.075, 0.105, 0.012), patMat, 0, 0.298, 0.092, outfitG);
        inner.rotation.x = -0.18;
        var cfL = mesh(new THREE.BoxGeometry(0.058, 0.013, 0.048), patMat, -0.050, 0.348, 0.072, outfitG);
        cfL.rotation.set(-0.28, 0.38, 0.14);
        var cfR = mesh(new THREE.BoxGeometry(0.058, 0.013, 0.048), patMat, 0.050, 0.348, 0.072, outfitG);
        cfR.rotation.set(-0.28, -0.38, -0.14);
      }
      if (avatar.henley) { // Marc's blue henley: placket + buttons
        var placket = mesh(new THREE.BoxGeometry(0.030, 0.09, 0.010), mats.shirt, 0, 0.215, 0.100, outfitG);
        placket.rotation.x = -0.25;
        mesh(new THREE.SphereGeometry(0.0065, 8, 6), mats.dark, 0, 0.238, 0.096, outfitG);
        mesh(new THREE.SphereGeometry(0.0065, 8, 6), mats.dark, 0, 0.210, 0.103, outfitG);
      }
      if (avatar.vest) { // Elias: maroon vest over the white shirt
        // Front panels angled into a clean V: open at the neck showing the
        // white shirt, meeting at center front below the chest. A center
        // strip with buttons covers the join.
        var vL = mesh(new THREE.BoxGeometry(0.10, 0.36, 0.028), mats.vest, -0.052, -0.02, 0.105, outfitG);
        var vR = mesh(new THREE.BoxGeometry(0.10, 0.36, 0.028), mats.vest, 0.052, -0.02, 0.105, outfitG);
        vL.rotation.z = 0.10; vL.rotation.y = 0.12;
        vR.rotation.z = -0.10; vR.rotation.y = -0.12;
        mesh(new THREE.BoxGeometry(0.035, 0.20, 0.030), mats.vest, 0, -0.11, 0.108, outfitG);
        mesh(new THREE.SphereGeometry(0.006, 8, 6), mats.dark, 0, -0.05, 0.124, outfitG);
        mesh(new THREE.SphereGeometry(0.006, 8, 6), mats.dark, 0, -0.10, 0.124, outfitG);
        mesh(new THREE.SphereGeometry(0.006, 8, 6), mats.dark, 0, -0.15, 0.124, outfitG);
        mesh(new THREE.BoxGeometry(0.21, 0.34, 0.028), mats.vest, 0, -0.01, -0.108, outfitG);
        mesh(new THREE.BoxGeometry(0.070, 0.022, 0.150), mats.vest, -0.100, 0.335, 0, outfitG);
        mesh(new THREE.BoxGeometry(0.070, 0.022, 0.150), mats.vest, 0.100, 0.335, 0, outfitG);
        mesh(new THREE.CylinderGeometry(0.165, 0.170, 0.035, 16), mats.dark, 0, -0.175, 0, outfitG); // waistband
      }
      if (avatar.badge) { // Anna's name badge on the left chest
        mesh(new THREE.BoxGeometry(0.040, 0.025, 0.006), mats.white, -0.080, 0.10, 0.128, outfitG);
        mesh(new THREE.SphereGeometry(0.006, 8, 6), mats.badgeRed, -0.088, 0.10, 0.132, outfitG);
      }
    }

    // ---- head (realistic adult face: jawline, cheekbones, nose, lips) ----
    var headG = new THREE.Group();
    headG.position.set(0, 0.52, 0);
    headG.scale.set(1.10, 1.07, 1.08); // anime proportion: a slightly larger head
    torso.add(headG);
    // Cranium: rounder and a touch wider than before. Jaw tapers the lower
    // face; chin finishes it.
    var skull = mesh(new THREE.SphereGeometry(0.098, 24, 18), mats.skin, 0, 0.018, -0.004, headG);
    skull.scale.set(0.95, 1.07, 0.96);
    var jaw = mesh(new THREE.SphereGeometry(0.072, 18, 14), mats.skin, 0, -0.048, 0.014, headG);
    jaw.scale.set(0.76, 0.80, 0.80);
    var chin = mesh(new THREE.SphereGeometry(0.028, 12, 10), mats.skin, 0, -0.088, 0.038, headG);
    chin.scale.set(0.80, 0.62, 0.70);
    // Cheekbones give the face its structure — kept flat so they shape the
    // face rather than bulging out of it.
    var chkL = mesh(new THREE.SphereGeometry(0.026, 12, 10), mats.skin, -0.053, -0.008, 0.045, headG);
    var chkR = mesh(new THREE.SphereGeometry(0.026, 12, 10), mats.skin, 0.053, -0.008, 0.045, headG);
    chkL.scale.set(0.88, 0.72, 0.50); chkR.scale.set(0.88, 0.72, 0.50);
    // Iris texture: a radial-gradient iris with fibers, baked per eye color
    // on a canvas — far richer than a flat colored disc.
    function shade(hex, f) {
      var r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
      var g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
      var b = Math.min(255, Math.round((hex & 255) * f));
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    function makeIrisTexture(hex) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d');
      var g = x.createRadialGradient(64, 64, 10, 64, 64, 62);
      g.addColorStop(0.00, '#140c06');
      g.addColorStop(0.18, shade(hex, 0.55));
      g.addColorStop(0.45, shade(hex, 1.0));
      g.addColorStop(0.75, shade(hex, 0.80));
      g.addColorStop(0.95, shade(hex, 0.35));
      g.addColorStop(1.00, '#0b0603');
      x.fillStyle = g;
      x.beginPath(); x.arc(64, 64, 64, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 1.5;
      for (var i = 0; i < 70; i++) {
        var a = Math.random() * Math.PI * 2;
        x.beginPath();
        x.moveTo(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18);
        x.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
        x.stroke();
      }
      x.strokeStyle = 'rgba(255,255,255,0.18)';
      for (var j = 0; j < 25; j++) {
        var b2 = Math.random() * Math.PI * 2;
        x.beginPath();
        x.moveTo(64 + Math.cos(b2) * 30, 64 + Math.sin(b2) * 30);
        x.lineTo(64 + Math.cos(b2) * 55, 64 + Math.sin(b2) * 55);
        x.stroke();
      }
      return new THREE.CanvasTexture(c);
    }
    // Anna's collar fabric: tiny floral sprigs on a dark ground.
    function makeCollarTexture() {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d');
      x.fillStyle = '#23262c'; x.fillRect(0, 0, 128, 128);
      var cols = ['#c9b98a', '#7a8a5a', '#a05a4a', '#d8d0b8', '#8a7a5a'];
      for (var i = 0; i < 42; i++) {
        var px = Math.random() * 128, py = Math.random() * 128;
        x.fillStyle = cols[(Math.random() * cols.length) | 0];
        for (var p = 0; p < 4; p++) {
          var a = p * Math.PI / 2 + Math.random() * 0.6;
          x.beginPath();
          x.arc(px + Math.cos(a) * 3.2, py + Math.sin(a) * 3.2, 2.3, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = '#3a2a1a';
        x.beginPath(); x.arc(px, py, 1.7, 0, Math.PI * 2); x.fill();
      }
      var t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }
    // Eyes: expressive and detailed — white, canvas-textured iris, pupil,
    // double catchlight, upper lid, lid creases, and lashes on women.
    var EYE_SX = 1.24, EYE_SY = 0.95, EYE_SZ = 0.60;
    function buildEye(side) {
      var g = new THREE.Group();
      g.position.set(side * 0.035, 0.014, 0.078);
      headG.add(g);
      var white = mesh(new THREE.SphereGeometry(0.018, 16, 12), mats.white, 0, 0, 0, g);
      white.scale.set(EYE_SX, EYE_SY, EYE_SZ);
      var iris = mesh(new THREE.CircleGeometry(0.0118, 24), mats.iris, 0, 0, 0.0092, g);
      mesh(new THREE.SphereGeometry(0.0052, 10, 8), mats.dark, 0, 0, 0.0128, g);
      mesh(new THREE.SphereGeometry(0.0030, 8, 6), mats.white, 0.004, 0.004, 0.0142, g);
      mesh(new THREE.SphereGeometry(0.0014, 6, 4), mats.white, -0.003, -0.003, 0.0142, g);
      var lid = mesh(new THREE.SphereGeometry(0.0205, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mats.skin, 0, 0.002, -0.002, g);
      lid.scale.set(EYE_SX, 0.85, 0.7);
      lid.rotation.x = -0.35;
      // Lid creases: thin lines above and below the eye giving the lids depth.
      var crease = mesh(new THREE.CapsuleGeometry(0.0015, 0.023, 3, 6), mats.skin, 0, 0.0160, 0.005, g);
      crease.rotation.z = Math.PI / 2;
      crease.scale.z = 0.5;
      var creaseLo = mesh(new THREE.CapsuleGeometry(0.0012, 0.020, 3, 6), mats.skin, 0, -0.0135, 0.005, g);
      creaseLo.rotation.z = Math.PI / 2;
      creaseLo.scale.z = 0.5;
      // Lashes: three tiny flicks on the outer upper lid (women).
      var lashes = new THREE.Group();
      for (var li = 0; li < 3; li++) {
        var lash = mesh(new THREE.ConeGeometry(0.0012, 0.008, 5), mats.dark,
          side * (0.012 + li * 0.006), 0.011 - li * 0.0012, 0.008, lashes);
        lash.rotation.z = side * -(0.5 + li * 0.25);
        lash.rotation.x = -0.4;
      }
      g.add(lashes);
      return { white: white, group: g, lashes: lashes };
    }
    var eyeL = buildEye(-1), eyeR = buildEye(1);
    // Brows: angled capsules; grammar moves them (see applyFace).
    var BROW_Z = Math.PI / 2;
    var browL = mesh(new THREE.CapsuleGeometry(0.0046, 0.032, 4, 8), mats.hair, -0.036, 0.052, 0.082, headG);
    browL.rotation.z = BROW_Z + 0.10; browL.rotation.y = -0.15;
    var browR = mesh(new THREE.CapsuleGeometry(0.0046, 0.032, 4, 8), mats.hair, 0.036, 0.052, 0.082, headG);
    browR.rotation.z = BROW_Z - 0.10; browR.rotation.y = 0.15;
    // Nose: bridge, tip and nostrils.
    var noseBridge = mesh(new THREE.CapsuleGeometry(0.0042, 0.018, 4, 8), mats.skin, 0, 0.002, 0.090, headG);
    noseBridge.rotation.x = 0.12;
    mesh(new THREE.SphereGeometry(0.0076, 12, 10), mats.skin, 0, -0.013, 0.091, headG);
    mesh(new THREE.SphereGeometry(0.0035, 8, 6), mats.nostril, -0.0075, -0.019, 0.086, headG);
    mesh(new THREE.SphereGeometry(0.0035, 8, 6), mats.nostril, 0.0075, -0.019, 0.086, headG);
    // Subtle cheek blush (women) — softens the skin like the reference.
    var blushMat = new THREE.MeshStandardMaterial({ color: 0xd9707a, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.38 });
    var blushL = mesh(new THREE.SphereGeometry(0.016, 10, 8), blushMat, -0.056, -0.028, 0.052, headG);
    var blushR = mesh(new THREE.SphereGeometry(0.016, 10, 8), blushMat, 0.056, -0.028, 0.052, headG);
    blushL.scale.set(1, 0.6, 0.5); blushR.scale.set(1, 0.6, 0.5);
    // Ears.
    var earL = mesh(new THREE.SphereGeometry(0.017, 10, 8), mats.skin, -0.093, -0.008, 0.0, headG);
    var earR = mesh(new THREE.SphereGeometry(0.017, 10, 8), mats.skin, 0.093, -0.008, 0.0, headG);
    earL.scale.set(0.5, 1, 0.7); earR.scale.set(0.5, 1, 0.7);
    // Mouth: fuller lips with a cupid's bow, teeth and a dark interior
    // behind them so smiles and open-mouth grammar read naturally.
    // A group so applyFace scales it.
    var mouth = new THREE.Group();
    mouth.position.set(0, -0.048, 0.078);
    headG.add(mouth);
    var inner = mesh(new THREE.SphereGeometry(0.014, 12, 10), mats.mouthInner, 0, -0.002, -0.004, mouth);
    inner.scale.set(1.15, 0.55, 0.5);
    var teeth = mesh(new THREE.BoxGeometry(0.030, 0.008, 0.006), mats.white, 0, 0.0025, 0.001, mouth);
    var bowL = mesh(new THREE.SphereGeometry(0.007, 8, 6), mats.lip, -0.006, 0.007, 0.001, mouth);
    var bowR = mesh(new THREE.SphereGeometry(0.007, 8, 6), mats.lip, 0.006, 0.007, 0.001, mouth);
    bowL.scale.set(1, 0.55, 0.6); bowR.scale.set(1, 0.55, 0.6);
    var upperLip = mesh(new THREE.SphereGeometry(0.018, 12, 10), mats.lip, 0, 0.0025, 0.002, mouth);
    upperLip.scale.set(1.0, 0.30, 0.5);
    var lowerLip = mesh(new THREE.SphereGeometry(0.015, 12, 10), mats.lip, 0, -0.0075, 0.002, mouth);
    lowerLip.scale.set(0.94, 0.45, 0.5);
    mesh(new THREE.BoxGeometry(0.028, 0.0028, 0.004), mats.nostril, 0, -0.0025, 0.005, mouth);
    // Optional stubble shading over the jaw (Marc).
    var stubbleM = mesh(new THREE.SphereGeometry(0.070, 14, 10), mats.stubble, 0, -0.052, 0.022, headG);
    stubbleM.scale.set(0.86, 0.84, 0.82);
    var hairG = new THREE.Group();
    headG.add(hairG);

    function buildHair(style) {
      while (hairG.children.length) hairG.remove(hairG.children[0]);
      var H = mats.hair;
      // Open-face shell: covers the top/back of the skull but leaves the
      // face (front) open, so hair can have real volume without ever
      // swallowing the eyes, brows or mouth. In three.js sphere space the
      // face looks toward +Z, which is phi = PI/2; the gap is centered there.
      function shell(r, y, z, gap, drop, sx, sy, sz) {
        var g = new THREE.SphereGeometry(r, 22, 14, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, drop);
        var m = mesh(g, H, 0, y, z, hairG);
        m.scale.set(sx || 1, sy || 1, sz || 1);
        m.material.side = THREE.DoubleSide;
        return m;
      }
      function puff(r, x, y, z, sx, sy, sz, rz) {
        var m = mesh(new THREE.SphereGeometry(r, 14, 12), H, x, y, z, hairG);
        m.scale.set(sx, sy, sz);
        if (rz) m.rotation.z = rz;
        return m;
      }
      if (style === 'longblack' || style === 'longbrown') { // anime: long hair past the shoulders
        shell(0.108, 0.048, -0.018, 1.02, Math.PI * 0.66, 1.04, 1.0, 1.04);
        puff(0.050, -0.092, -0.075, 0.002, 0.55, 1.85, 0.95);  // long side panels
        puff(0.050, 0.092, -0.075, 0.002, 0.55, 1.85, 0.95);
        puff(0.082, 0, -0.045, -0.078, 1.02, 1.35, 0.85);      // long back volume
        puff(0.056, 0.012, 0.090, 0.050, 1.15, 0.40, 0.70, -0.16); // side-swept fringe
      } else if (style === 'crop') { // anime: short crop (men)
        shell(0.104, 0.056, -0.014, 1.00, Math.PI * 0.54, 1.0, 0.86, 1.0);
        puff(0.055, 0.018, 0.096, 0.050, 1.20, 0.42, 0.68, -0.24); // swept fringe
        puff(0.040, -0.055, 0.078, 0.045, 1.0, 0.55, 0.7, 0.22);
      } else if (style === 'blondebob') { // Nia: layered blonde bob to the jaw
        shell(0.106, 0.045, -0.016, 1.05, Math.PI * 0.60, 1.03, 0.98, 1.03);
        puff(0.046, -0.088, -0.032, 0.006, 0.55, 1.30, 0.95); // side panels
        puff(0.046, 0.088, -0.032, 0.006, 0.55, 1.30, 0.95);
        puff(0.078, 0, 0.002, -0.072, 1.0, 1.10, 0.85);        // back volume
        puff(0.056, 0.014, 0.088, 0.052, 1.15, 0.40, 0.70, -0.18); // side-swept fringe
      } else if (style === 'brownhbob') { // Anna: short brown crop with fringe
        shell(0.104, 0.050, -0.016, 1.00, Math.PI * 0.56, 1.0, 0.92, 1.0);
        puff(0.030, -0.089, -0.018, 0.004, 0.55, 1.0, 0.9);   // sideburns
        puff(0.030, 0.089, -0.018, 0.004, 0.55, 1.0, 0.9);
        puff(0.058, 0, 0.090, 0.048, 1.25, 0.38, 0.65);        // straight fringe
      } else if (style === 'redcrop') { // Marc: red swept crop
        shell(0.103, 0.054, -0.014, 1.00, Math.PI * 0.52, 1.0, 0.82, 1.0);
        puff(0.055, 0.020, 0.094, 0.050, 1.20, 0.42, 0.68, -0.28); // swept fringe
        puff(0.040, -0.055, 0.075, 0.045, 1.0, 0.55, 0.7, 0.25);
      } else { // graycrop (Elias): short gray, slightly receded
        shell(0.102, 0.052, -0.022, 1.10, Math.PI * 0.50, 0.98, 0.72, 0.98);
        puff(0.028, -0.075, 0.055, 0.030, 1.0, 0.6, 0.8);     // temples
        puff(0.028, 0.075, 0.055, 0.030, 1.0, 0.6, 0.8);
      }
    }

    // ---- arms ----
    // Natural arms and hands (signing stays the focus, but hands are human
    // scale now, not oversized). Joint pivots are untouched — the sign
    // animation rig keeps working exactly as before.
    function buildFinger(x, parent) {
      var base = new THREE.Group();
      base.position.set(x, -0.092, 0.004);
      parent.add(base);
      var s1 = mesh(new THREE.CapsuleGeometry(0.0095, 0.028, 4, 8), mats.skin, 0, -0.019, 0, base);
      var mid = new THREE.Group(); mid.position.set(0, -0.038, 0); base.add(mid);
      mesh(new THREE.CapsuleGeometry(0.0085, 0.024, 4, 8), mats.skin, 0, -0.016, 0, mid);
      var tip = new THREE.Group(); tip.position.set(0, -0.034, 0); mid.add(tip);
      mesh(new THREE.CapsuleGeometry(0.0075, 0.020, 4, 8), mats.skin, 0, -0.013, 0, tip);
      return { base: base, mid: mid, tip: tip };
    }
    var armsG = new THREE.Group(); // rebuilt per avatar (sleeve lengths)
    torso.add(armsG);
    function buildArm(side) { // side: -1 = character's RIGHT arm (viewer's left), +1 = character's LEFT arm (viewer's right).
      // Sign space is authored +x = character's right (see sign-schema3d.md);
      // the camera looks down -z, so +x appears on the viewer's right, which
      // is the character's LEFT. Keep the labels anatomical, not screen-based.
      var shoulder = new THREE.Group();
      shoulder.position.set(side * SHOULDER_X, SHOULDER_Y, 0);
      armsG.add(shoulder);
      var longSleeve = avatar.sleeve !== 'short';
      // Upper arm: tapered, rooted deep inside the shoulder sphere so the
      // joint never visibly separates when the arm rotates.
      var upperMat = longSleeve ? mats.shirt : mats.skin;
      var upper = mesh(new THREE.CylinderGeometry(0.040, 0.047, 0.24, 12), upperMat, 0, -0.12, 0, shoulder);
      if (!longSleeve) {
        // Short sleeve over the top of the upper arm (Nia's purple tee).
        mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.10, 12), mats.shirt, 0, -0.05, 0, shoulder);
      }
      // Elbow: slight joint sphere, then a tapered forearm.
      var elbow = new THREE.Group();
      elbow.position.set(0, -L1, 0);
      shoulder.add(elbow);
      mesh(new THREE.SphereGeometry(0.036, 12, 10), longSleeve ? mats.shirt : mats.skin, 0, 0, 0, elbow);
      mesh(new THREE.CylinderGeometry(0.031, 0.039, 0.22, 12), longSleeve ? mats.shirt : mats.skin, 0, -0.12, 0, elbow);
      if (longSleeve) mesh(new THREE.CylinderGeometry(0.033, 0.036, 0.035, 12), mats.shirt, 0, -0.225, 0, elbow); // cuff
      var wrist = new THREE.Group();
      wrist.position.set(0, -L2, 0);
      elbow.add(wrist);
      // Natural rounded palm.
      var palm = mesh(new THREE.SphereGeometry(0.042, 14, 12), mats.skin, 0, -0.048, 0, wrist);
      palm.scale.set(0.95, 1.2, 0.5);
      var fingers = [
        buildFinger(-0.0255, wrist), buildFinger(-0.0085, wrist),
        buildFinger(0.0085, wrist), buildFinger(0.0255, wrist),
      ];
      // Thumb on the midline side of the palm.
      var thumbBase = new THREE.Group();
      thumbBase.position.set(-side * 0.037, -0.042, 0.006);
      thumbBase.rotation.z = side * 0.85;
      thumbBase.rotation.y = -side * 0.45;
      wrist.add(thumbBase);
      mesh(new THREE.CapsuleGeometry(0.0095, 0.026, 4, 8), mats.skin, 0, -0.019, 0, thumbBase);
      var thumbMid = new THREE.Group(); thumbMid.position.set(0, -0.038, 0); thumbBase.add(thumbMid);
      mesh(new THREE.CapsuleGeometry(0.0085, 0.022, 4, 8), mats.skin, 0, -0.015, 0, thumbMid);
      return { side: side, shoulder: shoulder, elbow: elbow, wrist: wrist, fingers: fingers, thumb: { base: thumbBase, mid: thumbMid } };
    }
    var armR = null, armL = null;
    function buildArms() {
      while (armsG.children.length) armsG.remove(armsG.children[0]);
      armR = buildArm(-1); armL = buildArm(1); // R on viewer's left = character's right
    }

    buildHair(avatar.hairStyle);
    buildOutfit();
    buildArms();

    /* ---------------- Rocketbox retarget ----------------
       When opts.rocketbox is set, the procedural avatar above becomes an
       invisible driver rig: the existing engine still solves its arm/hand
       joints every frame, and their world-space deltas are transferred onto
       a real Rocketbox humanoid skeleton (Microsoft Rocketbox, MIT license;
       see public/models/rb/LICENSE-Rocketbox.md). If the model fails to
       load, the procedural avatar is shown instead. */
    var rbMode = !!(opts && opts.rocketbox);
    var rbBase = rbMode ? String(opts.rocketbox.base || 'models/rb').replace(/\/+$/, '') : '';
    var RB_MODELS = { nia: 'F07B', anna: 'F07', marc: 'M12', elias: 'M16' };
    var avatarKey = (avatarName && AVATARS[avatarName]) ? avatarName : 'nia';
    var rb = null; // { wrap, pairs, ready, model, token }

    function rbModelFor(key) {
      if (opts.rocketbox.model) return opts.rocketbox.model;
      return RB_MODELS[key] || 'F01';
    }

    // Driver joints in stable order, each paired with its Rocketbox bone.
    // armR is the character's anatomical right arm (viewer's left, -X), so it
    // drives Bip01_R_*. (A previous revision cross-mapped the sides, which
    // mirrored every sign left-to-right against the reference videos.)
    function rbDriverList() {
      var list = [];
      [[armR, 'R'], [armL, 'L']].forEach(function (spec) {
        var arm = spec[0], P = spec[1];
        list.push([arm.shoulder, 'Bip01_' + P + '_UpperArm']);
        list.push([arm.elbow, 'Bip01_' + P + '_Forearm']);
        list.push([arm.wrist, 'Bip01_' + P + '_Hand']);
        for (var i = 0; i < 4; i++) {
          var f = arm.fingers[i], bn = 'Bip01_' + P + '_Finger' + (i + 1);
          list.push([f.base, bn]); list.push([f.mid, bn + '1']); list.push([f.tip, bn + '2']);
        }
        list.push([arm.thumb.base, 'Bip01_' + P + '_Finger0']);
        list.push([arm.thumb.mid, 'Bip01_' + P + '_Finger01']);
        list.push([arm.thumb.mid, 'Bip01_' + P + '_Finger02']);
      });
      return list;
    }

    var rbDriverRest = null; // driver Object3D -> rest world Quaternion
    function rbCaptureDriverRest() {
      // Poses the driver at the engine REST pose and records world quats.
      // Synchronous: no frame can render mid-task, so cur can be borrowed.
      var sR = cur.R, sL = cur.L;
      cur.R = JSON.parse(JSON.stringify(REST.R));
      cur.L = JSON.parse(JSON.stringify(REST.L));
      for (var i = 0; i < 80; i++) { // converge the incremental wrist slerp
        applyHand(armR, cur.R); cur.R.wristTwist = 0;
        applyHand(armL, cur.L);
      }
      rig.updateMatrixWorld(true);
      rbDriverRest = new Map();
      rbDriverList().forEach(function (pr) {
        rbDriverRest.set(pr[0], pr[0].getWorldQuaternion(new THREE.Quaternion()));
      });
      cur.R = sR; cur.L = sL;
    }

    function rbFindBone(root, name) {
      var b = root.getObjectByName(name);
      if (b) return b;
      var found = null;
      root.traverse(function (o) {
        if (!found && o.isBone && o.name && o.name.slice(-name.length) === name) found = o;
      });
      return found;
    }

    function rbDisposeWrap(wrap) {
      if (!wrap) return;
      wrap.traverse(function (o) {
        if (o.isMesh || o.isSkinnedMesh) {
          if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) {
            if (!mt) return;
            ['map', 'normalMap', 'emissiveMap', 'aoMap', 'alphaMap'].forEach(function (k) {
              if (mt[k]) { try { mt[k].dispose(); } catch (e) {} }
            });
            try { mt.dispose(); } catch (e) {}
          });
        }
      });
    }

    // Remove the Rocketbox model and fall back to the procedural avatar.
    function rbFallback() {
      if (!rb) return;
      if (rb.wrap) { scene.remove(rb.wrap); rbDisposeWrap(rb.wrap); rb.wrap = null; }
      rb.pairs = []; rb.ready = false; rb.model = null;
      if (rbMode) {
        rig.visible = true;
        camera.position.set(0, 0.30, 1.55);
        camera.lookAt(0, 0.25, 0);
      }
    }

    var _rq1 = new THREE.Quaternion(), _rq2 = new THREE.Quaternion(), _rq3 = new THREE.Quaternion();
    function rbRetarget() {
      if (!rb || !rb.ready) return;
      rig.updateMatrixWorld(true);
      for (var i = 0; i < rb.pairs.length; i++) {
        var pr = rb.pairs[i];
        pr.driver.getWorldQuaternion(_rq1);                 // D
        _rq2.copy(_rq1).multiply(pr.d0inv).multiply(pr.w0); // D * D0^-1 * W0
        pr.bone.parent.getWorldQuaternion(_rq3);
        pr.bone.quaternion.copy(_rq3.invert().multiply(_rq2));
      }
      // Positional pass for the arm chains: rotation transfer alone
      // leaves the model's wrists off the driver's wrist positions
      // whenever the model's proportions differ from the rig's — the
      // anime model's shoulders are ~0.20m apart vs the rig's 0.40m,
      // which threw cross-body reaches (the BSL support hand) off by
      // ~10cm. So per arm: aim the model's upper-arm bone at the
      // driver's elbow position and its forearm bone at the driver's
      // wrist position (directions from the model's own joints, lengths
      // from its own skeleton), then re-apply the wrist + finger
      // quaternion pairs so palm and finger orientations stay authored.
      function aimBoneWorld(bone, childBone, targetPos) {
        var bp = bone.getWorldPosition(new THREE.Vector3());
        var cp = childBone.getWorldPosition(new THREE.Vector3());
        var cur = cp.sub(bp);
        if (cur.lengthSq() < 1e-8) return;
        cur.normalize();
        var want = targetPos.clone().sub(bp);
        if (want.lengthSq() < 1e-8) return;
        want.normalize();
        var q = new THREE.Quaternion().setFromUnitVectors(cur, want);
        var bw = bone.getWorldQuaternion(new THREE.Quaternion());
        var pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.copy(pw.invert().multiply(q).multiply(bw));
        bone.updateWorldMatrix(true, true);
      }
      [armR, armL].forEach(function (arm) {
        var shP = null, elP = null, wrP = null, handPairs = [];
        for (var j = 0; j < rb.pairs.length; j++) {
          var p2 = rb.pairs[j];
          if (p2.driver === arm.shoulder) shP = p2;
          else if (p2.driver === arm.elbow) elP = p2;
          else if (p2.driver === arm.wrist) { wrP = p2; handPairs.push(p2); }
          else if (p2.driver === arm.thumb.base || p2.driver === arm.thumb.mid) handPairs.push(p2);
          else {
            for (var fi = 0; fi < 4; fi++) {
              var f = arm.fingers[fi];
              if (p2.driver === f.base || p2.driver === f.mid || p2.driver === f.tip) { handPairs.push(p2); break; }
            }
          }
        }
        if (!shP || !elP || !wrP) return;
        var eT = elP.driver.getWorldPosition(new THREE.Vector3());
        var wT = wrP.driver.getWorldPosition(new THREE.Vector3());
        aimBoneWorld(shP.bone, elP.bone, eT);
        aimBoneWorld(elP.bone, wrP.bone, wT);
        handPairs.forEach(function (fp) {
          fp.driver.getWorldQuaternion(_rq1);
          _rq2.copy(_rq1).multiply(fp.d0inv).multiply(fp.w0);
          fp.bone.parent.getWorldQuaternion(_rq3);
          fp.bone.quaternion.copy(_rq3.invert().multiply(_rq2));
        });
      });
    }

    async function rbLoad(model) {
      if (!rb) rb = {};
      if (typeof FBXLoader === 'undefined') { rbFallback(); return false; }
      var token = (rb.token || 0) + 1;
      rb.token = token; rb.ready = false;
      try {
        var res = await fetch(rbBase + '/' + model + '/' + model + '.fbx');
        if (!res.ok) throw new Error('fbx http ' + res.status);
        var fbx = new FBXLoader().parse(await res.arrayBuffer(), '');
        if (token !== rb.token) return false; // superseded by a newer load
        var tl = new THREE.TextureLoader();
        async function lt(p) {
          try { var t = await tl.loadAsync(p); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; }
          catch (e) { return null; }
        }
        var mdir = rbBase + '/' + model + '/';
        var bodyTex = await lt(mdir + 'body.jpg');
        var headTex = await lt(mdir + 'head.jpg');
        var opTex = await lt(mdir + 'opacity.jpg');
        if (token !== rb.token) return false;
        fbx.traverse(function (o) {
          if (o.isMesh || o.isSkinnedMesh) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) {
              if (!mt) return;
              var n = (mt.name || '').toLowerCase();
              mt.color.setRGB(1, 1, 1);
              // The FBX binds map/normalMap slots to texture references that
              // never resolve; a bound texture with no image samples as black
              // and kills the diffuse. Clear every map slot first, then assign
              // our own textures where they loaded.
              mt.map = null; mt.normalMap = null; mt.emissiveMap = null;
              mt.aoMap = null; mt.alphaMap = null;
              if (n.indexOf('head') >= 0) { if (headTex) mt.map = headTex; }
              else if (n.indexOf('opacity') >= 0) {
                if (bodyTex) mt.map = bodyTex;
                if (opTex) { mt.alphaMap = opTex; mt.transparent = true; mt.alphaTest = 0.35; mt.side = THREE.DoubleSide; }
              } else if (bodyTex) mt.map = bodyTex;
              mt.needsUpdate = true;
            });
          }
        });
        // Align to the engine's signing space: uniform scale from arm length,
        // then shoulders onto the engine shoulder line (small +Y compromise
        // so face-referenced signs land near the model's face).
        var wrap = new THREE.Group();
        wrap.add(fbx);
        if (rb.wrap) { scene.remove(rb.wrap); rbDisposeWrap(rb.wrap); }
        scene.add(wrap);
        rb.wrap = wrap;
        fbx.updateMatrixWorld(true);
        function wp(nm) { var b = rbFindBone(fbx, nm); var v = new THREE.Vector3(); b.getWorldPosition(v); return v; }
        var ua = wp('Bip01_L_UpperArm'), fo = wp('Bip01_L_Forearm'), ha = wp('Bip01_L_Hand');
        var k = (L1 + L2) / (ua.distanceTo(fo) + fo.distanceTo(ha));
        wrap.scale.setScalar(k);
        wrap.updateMatrixWorld(true);
        var sL = wp('Bip01_L_UpperArm'), sR = wp('Bip01_R_UpperArm');
        var mid = sL.add(sR).multiplyScalar(0.5);
        wrap.position.set(-mid.x, SHOULDER_Y - mid.y + 0.03, -mid.z);
        wrap.updateMatrixWorld(true);
        var pairs = [];
        rbDriverList().forEach(function (dp) {
          var bone = rbFindBone(fbx, dp[1]);
          var d0 = rbDriverRest && rbDriverRest.get(dp[0]);
          if (!bone || !d0) return;
          pairs.push({
            driver: dp[0], bone: bone,
            d0inv: d0.clone().invert(),
            w0: bone.getWorldQuaternion(new THREE.Quaternion()),
          });
        });
        if (!pairs.length) throw new Error('no bones paired');
        rb.pairs = pairs; rb.model = model; rb.ready = true;
        // Frame the humanoid: head, torso and signing space in view.
        camera.position.set(0, 0.30, 2.1);
        camera.lookAt(0, 0.20, 0);
        return true;
      } catch (e) {
        if (token === rb.token) rbFallback(); // superseded loads leave state alone
        return false;
      }
    }

    /* ---------------- VRM anime model (demo, 2026-11-18) ----------------
       When opts.vrm is set, the 'nia' avatar is a real anime character
       (VRoid-format VRM, recoloured to the owner's sample: deep-brown
       skin, near-black hair, orange top) loaded with GLTFLoader and
       driven by the same retarget machinery as Rocketbox: the invisible
       procedural rig solves the sign, and world-quaternion deltas
       transfer onto the model's J_Bip humanoid bones, fingers included.
       Other avatars keep the procedural anime look. Face grammar maps
       onto the model's Fcl morphs (Joy / Angry / Surprised / brows /
       blink). */
    var vrmMode = !!(opts && opts.vrm);
    var vrmUrl = vrmMode ? String(opts.vrm.url || 'models/anime/nia.vrm') : '';
    var vrmFace = null; // { mesh, idx: { morphSuffix -> influence index } }
    var vrmHairPanels = []; // long-hair panels added for the sample look

    function vrmDriverList() {
      var list = [];
      [[armR, 'R'], [armL, 'L']].forEach(function (spec) {
        var arm = spec[0], P = spec[1];
        list.push([arm.shoulder, 'J_Bip_' + P + '_UpperArm']);
        list.push([arm.elbow, 'J_Bip_' + P + '_LowerArm']);
        list.push([arm.wrist, 'J_Bip_' + P + '_Hand']);
        var names = ['Index', 'Middle', 'Ring', 'Little'];
        for (var i = 0; i < 4; i++) {
          var f = arm.fingers[i], bn = 'J_Bip_' + P + '_' + names[i];
          list.push([f.base, bn + '1']); list.push([f.mid, bn + '2']); list.push([f.tip, bn + '3']);
        }
        list.push([arm.thumb.base, 'J_Bip_' + P + '_Thumb1']);
        list.push([arm.thumb.mid, 'J_Bip_' + P + '_Thumb2']);
        list.push([arm.thumb.mid, 'J_Bip_' + P + '_Thumb3']);
      });
      return list;
    }

    function vrmUnload() {
      vrmHairPanels.forEach(function (m) { if (m.parent) m.parent.remove(m); if (m.geometry) m.geometry.dispose(); });
      vrmHairPanels = [];
      if (rb && rb.wrap) { scene.remove(rb.wrap); rbDisposeWrap(rb.wrap); rb.wrap = null; }
      if (rb) { rb.pairs = []; rb.ready = false; rb.model = null; }
      vrmFace = null;
      rig.visible = true;
      camera.position.set(0, 0.30, 1.55);
      camera.lookAt(0, 0.25, 0);
    }

    function vrmApplyFace() {
      if (!vrmFace || !rb || rb.model !== 'vrm') return;
      var inf = vrmFace.mesh.morphTargetInfluences, idx = vrmFace.idx;
      function set(key, w) { var i = idx[key]; if (i != null) inf[i] = w; }
      set('joy', 0); set('angry', 0); set('fun', 0); set('sorrow', 0); set('surprised', 0);
      if (faceTarget === 'positive') set('joy', 0.7);
      else if (faceTarget === 'question') { set('surprised', 0.55); set('fun', 0.25); }
      else if (faceTarget === 'emphasis') set('angry', 0.6);
      set('blink', Math.min(1, Math.max(0, 1 - (blinkScale || 1))));
    }

    async function vrmLoad() {
      if (!rb) rb = {};
      if (typeof THREE.GLTFLoader === 'undefined') return false;
      var token = (rb.token || 0) + 1;
      rb.token = token; rb.ready = false;
      try {
        // Fetch once: the same bytes feed GLTFLoader and the VRM
        // blend-shape table (GLTFLoader drops the VRM extension, and
        // this model's morph dictionary is numeric — the authoritative
        // group -> target-index map lives in blendShapeMaster).
        var ab = await (await fetch(vrmUrl)).arrayBuffer();
        if (token !== rb.token) return false;
        var dv = new DataView(ab);
        var jsonLen = dv.getUint32(12, true);
        var vrmJson = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 20, jsonLen)));
        var gltf = await new Promise(function (res, rej) {
          new THREE.GLTFLoader().parse(ab, '', res, rej);
        });
        if (token !== rb.token) return false;
        var model = gltf.scene;
        model.traverse(function (o) { if (o.isSkinnedMesh) o.frustumCulled = false; });
        var wrap = new THREE.Group();
        wrap.add(model);
        wrap.rotation.y = Math.PI; // the VRM loads facing away; turn her to the viewer
        if (rb.wrap) { scene.remove(rb.wrap); rbDisposeWrap(rb.wrap); }
        scene.add(wrap);
        rb.wrap = wrap;
        model.updateMatrixWorld(true);
        function wp(nm) { var b = rbFindBone(model, nm); var v = new THREE.Vector3(); b.getWorldPosition(v); return v; }
        var ua = wp('J_Bip_L_UpperArm'), fo = wp('J_Bip_L_LowerArm'), ha = wp('J_Bip_L_Hand');
        var k = (L1 + L2) / (ua.distanceTo(fo) + fo.distanceTo(ha));
        wrap.scale.setScalar(k);
        wrap.updateMatrixWorld(true);
        var sL = wp('J_Bip_L_UpperArm'), sR = wp('J_Bip_R_UpperArm');
        var mid = sL.add(sR).multiplyScalar(0.5);
        wrap.position.set(-mid.x, SHOULDER_Y - mid.y + 0.03, -mid.z);
        wrap.updateMatrixWorld(true);
        // Rest-pose correction: the VRM bind pose is a strict T-pose, but
        // the retarget transfers deltas measured from the driver REST pose
        // (arms relaxed, hands low in front of the body). Pre-aim the
        // model's arm bones at the driver's rest directions BEFORE the
        // pair rest-quaternions are captured below, so idle reads as a
        // natural stance and signs land in front of the body instead of
        // riding on top of a T-pose with the hands out of frame.
        function aimBone(boneName, childName, dx, dy, dz) {
          var b = rbFindBone(model, boneName), c = rbFindBone(model, childName);
          if (!b || !c || !b.parent) return;
          model.updateMatrixWorld(true);
          var bp = new THREE.Vector3(), cp = new THREE.Vector3();
          b.getWorldPosition(bp); c.getWorldPosition(cp);
          var curDir = cp.sub(bp).normalize();
          var want = new THREE.Vector3(dx, dy, dz).normalize();
          var q = new THREE.Quaternion().setFromUnitVectors(curDir, want);
          var bw = b.getWorldQuaternion(new THREE.Quaternion());
          var pw = b.parent.getWorldQuaternion(new THREE.Quaternion());
          b.quaternion.copy(pw.invert().multiply(q).multiply(bw));
          model.updateMatrixWorld(true);
        }
        // Aim each arm so the model's wrist lands exactly on the DRIVER's
        // rest wrist target (REST.R/L.t), solving the elbow with the same
        // down-back-out pole solveArm uses. The earlier hand-picked aim
        // directions left the model's rest hands ~13cm away from the
        // driver's rest hands, and that offset carried into every sign —
        // hands landed too central, too far forward, and the two hands
        // separated during two-handed signs and BSL fingerspelling.
        function aimArm(P, restT) {
          var S = wp('J_Bip_' + P + '_UpperArm');
          var E0 = wp('J_Bip_' + P + '_LowerArm');
          var H0 = wp('J_Bip_' + P + '_Hand');
          var l1 = S.distanceTo(E0), l2 = E0.distanceTo(H0);
          var W = new THREE.Vector3(restT[0], restT[1], restT[2]);
          var n = W.clone().sub(S);
          var d = Math.min(n.length(), l1 + l2 - 0.004);
          n.normalize();
          var pole = new THREE.Vector3(Math.sign(S.x) * 0.35 || 0.35, -1, -0.30);
          var m = pole.sub(n.clone().multiplyScalar(pole.dot(n))).normalize();
          var cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
          var sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
          var E = S.clone().add(n.clone().multiplyScalar(cosA * l1)).add(m.multiplyScalar(sinA * l1));
          var d1 = E.clone().sub(S), d2 = W.clone().sub(E);
          aimBone('J_Bip_' + P + '_UpperArm', 'J_Bip_' + P + '_LowerArm', d1.x, d1.y, d1.z);
          aimBone('J_Bip_' + P + '_LowerArm', 'J_Bip_' + P + '_Hand', d2.x, d2.y, d2.z);
        }
        aimArm('R', REST.R.t);
        aimArm('L', REST.L.t);
        var pairs = [];
        vrmDriverList().forEach(function (dp) {
          var bone = rbFindBone(model, dp[1]);
          var d0 = rbDriverRest && rbDriverRest.get(dp[0]);
          if (!bone || !d0) return;
          pairs.push({ driver: dp[0], bone: bone, d0inv: d0.clone().invert(), w0: bone.getWorldQuaternion(new THREE.Quaternion()) });
        });
        if (!pairs.length) throw new Error('no vrm bones paired');
        vrmFace = null;
        try {
          var groups = vrmJson.extensions.VRM.blendShapeMaster.blendShapeGroups || [];
          var faceObj = null, richest = null, richestN = 0;
          model.traverse(function (o) {
            if (o.morphTargetInfluences) {
              if (o.name === 'Face') faceObj = o;
              if (o.morphTargetInfluences.length > richestN) { richestN = o.morphTargetInfluences.length; richest = o; }
            }
          });
          faceObj = faceObj || richest;
          var idx = {};
          groups.forEach(function (g) {
            var key = (g.presetName && g.presetName !== 'unknown') ? g.presetName : String(g.name || '').toLowerCase();
            (g.binds || []).forEach(function (b) { if (b.mesh === 0 && idx[key] == null) idx[key] = b.index; });
          });
          if (faceObj && idx.blink != null) vrmFace = { mesh: faceObj, idx: idx };
        } catch (e) { vrmFace = null; }
        rb.pairs = pairs; rb.model = 'vrm'; rb.ready = true;
        rig.visible = false;
        // Idle-life anchors: wrap base height for breathing, head/neck
        // bind poses for the micro-sway in tick.
        rb.baseY = wrap.position.y;
        rb.headBone = rbFindBone(model, 'J_Bip_C_Head');
        rb.headBind = rb.headBone ? rb.headBone.quaternion.clone() : null;
        rb.neckBone = rbFindBone(model, 'J_Bip_C_Neck');
        rb.neckBind = rb.neckBone ? rb.neckBone.quaternion.clone() : null;
        // Long hair: the base model's own hair is a jaw-length bob, but
        // the owner's sample has long hair past the shoulders. Add three
        // toon-shaded hair panels (back + two sides) with a painted
        // strand texture, hung from the crown and attached to the wrap
        // so they ride her breathing. The head bone itself is not driven
        // by the signer (only a micro-sway), so panels stay registered.
        try {
          vrmHairPanels.forEach(function (m) { if (m.parent) m.parent.remove(m); if (m.geometry) m.geometry.dispose(); });
          vrmHairPanels = [];
          var headW = wp('J_Bip_C_Head'), neckW = wp('J_Bip_C_Neck');
          var headR = neckW ? headW.distanceTo(neckW) : 0.10;
          var crownY = headW.y + headR * 0.95;
          // Use the model's OWN hair material for the panels (cloned from
          // the Hair mesh): same texture, same shading response as the
          // bob, so panels and bob are one hair colour by construction.
          // Every flat colour tried rendered lighter than the bob under
          // this scene's lights; matching the material removes the
          // two-tone step entirely.
          var hairMat = null;
          model.traverse(function (o) {
            if (!hairMat && o.isMesh && /hair/i.test(o.name || '')) {
              var hm = Array.isArray(o.material) ? o.material[0] : o.material;
              if (hm) { hairMat = hm.clone(); hairMat.side = THREE.DoubleSide; }
            }
          });
          // Strand texture drawn once: near-black base with layered
          // strand strokes and a soft sheen band. The model's own hair
          // texture is almost uniform black, so flat sheets lit flatly
          // merge into one mass — painted strand lines are what make
          // separate strands visible, as on the sample character.
          var strandTex = null;
          try {
            var sc = document.createElement('canvas'); sc.width = 256; sc.height = 512;
            var sx2 = sc.getContext('2d');
            // Smooth "tube" shading across the width — dark edges, a
            // soft lighter centre — so each strand reads as a rounded
            // lock of smooth hair. (The previous bold speckle strokes
            // read as braids/locs; smooth hair is low-contrast and
            // long, with shading doing the work, not speckles.)
            sx2.fillStyle = '#131313'; sx2.fillRect(0, 0, 256, 512);
            var tube = sx2.createLinearGradient(0, 0, 256, 0);
            tube.addColorStop(0, 'rgba(0,0,0,0.55)');
            tube.addColorStop(0.28, 'rgba(90,90,90,0.10)');
            tube.addColorStop(0.5, 'rgba(150,150,150,0.16)');
            tube.addColorStop(0.72, 'rgba(90,90,90,0.10)');
            tube.addColorStop(1, 'rgba(0,0,0,0.55)');
            sx2.fillStyle = tube; sx2.fillRect(0, 0, 256, 512);
            var grad = sx2.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, 'rgba(70,70,70,0.22)');
            grad.addColorStop(0.45, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.30)');
            sx2.fillStyle = grad; sx2.fillRect(0, 0, 256, 512);
            for (var ti = 0; ti < 18; ti++) { // long, faint strand lines
              var tx0 = Math.random() * 256;
              sx2.strokeStyle = Math.random() < 0.5 ? 'rgba(150,150,150,0.10)' : 'rgba(0,0,0,0.22)';
              sx2.lineWidth = 2 + Math.random() * 3;
              sx2.beginPath(); sx2.moveTo(tx0, -10);
              sx2.bezierCurveTo(tx0 + (Math.random() * 8 - 4), 150, tx0 + (Math.random() * 8 - 4), 340, tx0 + (Math.random() * 10 - 5), 522);
              sx2.stroke();
            }
            strandTex = new THREE.CanvasTexture(sc);
            if (THREE.sRGBEncoding) strandTex.encoding = THREE.sRGBEncoding;
          } catch (e) { strandTex = null; }
          function hairPanel(cx, topY, cz, w0, len, bowZ, seed, drapeZ, color, pinch, topArch, wrapZ, taperK, edgeAmp, shade) {
            var rows = 14, pos = [], idx = [], uvs = [];
            var cols = [-1, -0.5, 0, 0.5, 1];
            for (var i = 0; i <= rows; i++) {
              var t = i / rows;
              var yBase = topY - t * len - (i === rows ? 0.014 : 0);
              var jit = 1 + 0.07 * Math.sin(seed + i * 2.39) * (i === 0 ? 0 : 1);
              var hw = (w0 / 2) * (1 - (taperK || 0.42) * t) * jit;
              if (pinch) hw *= 1 - pinch * Math.max(0, 1 - t * 3); // narrow top, tucks behind the head
              var zc = cz + Math.sin(t * Math.PI) * bowZ + t * (drapeZ || 0) + Math.sin(t * 7.5 + seed) * 0.011;
              // Gentle S-sway that grows toward the tip, so a strand
              // curves instead of hanging ruler-straight.
              var cxr = cx + Math.sin(t * 5.0 + seed) * 0.008 + Math.sin(t * 3.1 + seed * 1.3) * 0.010 * t;
              for (var j = 0; j < cols.length; j++) {
                var f = cols[j];
                // Arched top edge: edge columns drop by topArch * f^2 for
                // their whole length, so no panel presents a straight
                // horizontal top line (the "slab / backdrop" read), and
                // the centre strand hangs longest, like real hair cards.
                var drop = (topArch || 0) * f * f;
                // Cross-section curve: edges pulled in z so the sheet
                // wraps around the head/chest instead of lying dead flat.
                var zz = zc + (wrapZ || 0) * f * f;
                var yy = yBase - drop + (i === rows && f !== 0 ? 0.030 : 0);
                // Independent edge undulation: each side edge wanders on
                // its own phase, growing downward — the silhouette reads
                // as hair strands, not a cut ribbon.
                var eOff = 0;
                if (f !== 0 && edgeAmp) eOff = Math.sin(t * 6.0 + seed + (f > 0 ? 2.1 : 0)) * edgeAmp * t * Math.abs(f);
                pos.push(cxr + f * hw + eOff, yy, zz);
                uvs.push((f + 1) / 2, 1 - t);
              }
              if (i < rows) {
                var a = i * cols.length, b = a + cols.length;
                for (var k = 0; k < cols.length - 1; k++) {
                  idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1);
                }
              }
            }
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(idx);
            geo.computeVertexNormals();
            var mat;
            if (hairMat) {
              // Per-strand clone with a slight shade multiplier: subtle
              // light/dark variation between strands is what makes
              // separate strands visible as layers instead of one mass.
              mat = hairMat.clone();
              if (shade && mat.color) mat.color.multiplyScalar(shade);
              if (strandTex) mat.map = strandTex;
            } else {
              mat = std(color || 0x17120e);
              if (strandTex) mat.map = strandTex;
            }
            mat.side = THREE.DoubleSide;
            var mesh = new THREE.Mesh(geo, mat);
            scene.add(mesh);
            wrap.attach(mesh); // keep world placement, ride the wrap from here
            vrmHairPanels.push(mesh);
            return mesh;
          }
          // Placement rule learned the hard way: panels must sit OUTSIDE
          // the torso volume (back z < -0.09, front z > +0.13 at chest
          // height, sides beyond the neck silhouette) or the body hides
          // them and only neck-high slivers show.
          // Hair is built from overlapping STRANDS, not single sheets:
          // narrow tapered strips with staggered lengths and undulating
          // edges read as layered hair; one wide sheet reads as a board.
          // Back: four narrow strands with real gaps between them —
          // strands spaced wider than their width, strongly tapered,
          // with staggered lengths and slight shade steps per strand.
          hairPanel(headW.x - 0.072, crownY - headR * 0.35, headW.z - headR * 1.0 + 0.004, 0.042, 0.58, -0.010, 1.7, -0.050, 0x17120e, 0.25, 0.050, 0.050, 0.60, 0.010, 0.93);
          hairPanel(headW.x - 0.024, crownY - headR * 0.35, headW.z - headR * 1.0, 0.042, 0.64, -0.010, 3.3, -0.050, 0x17120e, 0.25, 0.050, 0.050, 0.60, 0.010, 1.00);
          hairPanel(headW.x + 0.024, crownY - headR * 0.35, headW.z - headR * 1.0, 0.042, 0.64, -0.010, 5.1, -0.050, 0x17120e, 0.25, 0.050, 0.050, 0.60, 0.010, 0.97);
          hairPanel(headW.x + 0.072, crownY - headR * 0.35, headW.z - headR * 1.0 + 0.004, 0.042, 0.58, -0.010, 6.9, -0.050, 0x17120e, 0.25, 0.050, 0.050, 0.60, 0.010, 0.90);
          // Sides: three strands each, tops tucked up under the bob and
          // pinched so they emerge from beneath it instead of butting
          // against it (kills the step/notch at the jaw line); lengths
          // staggered so no two strands end on the same line.
          hairPanel(headW.x - headR * 1.18, crownY + 0.01, headW.z + headR * 0.30, 0.046, 0.60, 0.012, 4.2, 0.030, 0x17120e, 0.30, 0.040, 0.018, 0.60, 0.009, 1.00);
          hairPanel(headW.x - headR * 1.42, crownY + 0.01, headW.z + headR * 0.15, 0.046, 0.55, 0.012, 6.0, 0.030, 0x17120e, 0.30, 0.040, 0.018, 0.60, 0.009, 0.94);
          hairPanel(headW.x - headR * 1.62, crownY + 0.01, headW.z + headR * 0.00, 0.046, 0.48, 0.012, 7.8, 0.030, 0x17120e, 0.30, 0.040, 0.018, 0.60, 0.009, 0.90);
          hairPanel(headW.x + headR * 1.18, crownY + 0.01, headW.z + headR * 0.30, 0.046, 0.60, 0.012, 9.6, 0.030, 0x17120e, 0.30, 0.040, 0.018, 0.60, 0.009, 1.00);
          hairPanel(headW.x + headR * 1.42, crownY + 0.01, headW.z + headR * 0.15, 0.046, 0.55, 0.012, 11.4, 0.030, 0x17120e, 0.30, 0.040, 0.018, 0.60, 0.009, 0.94);
          hairPanel(headW.x + headR * 1.62, crownY + 0.01, headW.z + headR * 0.00, 0.046, 0.48, 0.012, 13.2, 0.030, 0x17120e, 0.30, 0.040, 0.018, 0.60, 0.009, 0.90);
          // Front falls over the shoulders, like the sample's hair —
          // without these the length hides behind her from the front.
          // Wide enough out to lie over the orange fabric, not in the V.
          // Shoulder-drape strands: start beside the face like the side
          // strands but drape strongly forward, so the hair crosses
          // OVER the shoulder onto the chest — no orange gap between
          // where the side hair ends and the front falls begin.
          hairPanel(headW.x - headR * 1.30, crownY - 0.02, headW.z + headR * 0.75, 0.038, 0.58, 0.030, 15.0, 0.110, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.95);
          hairPanel(headW.x + headR * 1.30, crownY - 0.02, headW.z + headR * 0.75, 0.038, 0.58, 0.030, 16.8, 0.110, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.95);
          // Front falls sit FORWARD of the measured chest surface
          // (z 0.142-0.161 across the chest band) along their whole
          // length — an earlier build had them buried inside the torso
          // until mid-chest, so they appeared to "start" halfway down.
          hairPanel(headW.x - headR * 0.62, crownY - 0.01, headW.z + headR * 1.10, 0.047, 0.56, 0.030, 18.6, 0.070, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.98);
          hairPanel(headW.x - headR * 0.80, crownY - 0.02, headW.z + headR * 1.05, 0.047, 0.58, 0.030, 2.6, 0.075, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.97);
          hairPanel(headW.x - headR * 1.08, crownY - 0.02, headW.z + headR * 0.98, 0.047, 0.57, 0.028, 4.4, 0.080, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 1.00);
          hairPanel(headW.x - headR * 1.34, crownY - 0.02, headW.z + headR * 0.88, 0.047, 0.55, 0.026, 6.2, 0.085, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.92);
          hairPanel(headW.x + headR * 0.62, crownY - 0.01, headW.z + headR * 1.10, 0.047, 0.56, 0.030, 20.4, 0.070, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.98);
          hairPanel(headW.x + headR * 0.80, crownY - 0.02, headW.z + headR * 1.05, 0.047, 0.58, 0.030, 9.4, 0.075, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.97);
          hairPanel(headW.x + headR * 1.08, crownY - 0.02, headW.z + headR * 0.98, 0.047, 0.57, 0.028, 11.2, 0.080, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 1.00);
          hairPanel(headW.x + headR * 1.34, crownY - 0.02, headW.z + headR * 0.88, 0.047, 0.55, 0.026, 13.0, 0.085, 0x20150d, 0, 0.022, -0.012, 0.38, 0.004, 0.92);
        } catch (e) { /* hair panels are cosmetic; never fail the load */ }
        // Portrait framing like the sample video: head, torso and the
        // signing space fill the frame (the old full-body shot made the
        // hands tiny and the whole figure read as a doll).
        camera.position.set(0, 0.28, 1.55);
        camera.lookAt(0, 0.24, 0);
        return true;
      } catch (e) {
        return false; // stay on the procedural avatar
      }
    }

    if (rbMode) {
      rig.visible = false; // procedural rig drives invisibly; RB appears on load
    }

    /* ---------------- animation ---------------- */

    var language = 'asl';
    var token = 0;
    var destroyed = false;

    var REST = {
      R: { t: [-0.17, -0.06, 0.10], curl: { I: 0.25, M: 0.25, R: 0.3, P: 0.35, T: 0.3, spread: 0.25 }, palm: 'in' },
      L: { t: [0.17, -0.06, 0.10], curl: { I: 0.25, M: 0.25, R: 0.3, P: 0.35, T: 0.3, spread: 0.25 }, palm: 'in' },
      face: 'neutral',
    };
    // Live pose state (targets the tick loop eases toward).
    var cur = JSON.parse(JSON.stringify({ R: REST.R, L: REST.L, face: REST.face }));
    var tgt = JSON.parse(JSON.stringify({ R: REST.R, L: REST.L, face: REST.face }));
    var faceTarget = 'neutral';
    var blinkScale = 1; // set in tick, consumed by applyFace

    var _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
    var _q1 = new THREE.Quaternion();
    var DOWN = new THREE.Vector3(0, -1, 0);

    function solveArm(arm, tx, ty, tz) {
      _v1.set(arm.side * SHOULDER_X, SHOULDER_Y, 0); // S
      _v2.set(tx, ty, tz).sub(_v1); // d
      var dist = _v2.length();
      var maxD = L1 + L2 - 0.002;
      if (dist > maxD) { _v2.multiplyScalar(maxD / dist); dist = maxD; }
      if (dist < 0.06) { _v2.set(0, -1, 0.06).normalize().multiplyScalar(0.06); dist = 0.06; }
      var n = _v2.clone().normalize();
      var cosA = clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
      var sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      // Elbow pole: down, slightly out and back — natural arm bend.
      _v3.set(arm.side * 0.35, -1, -0.30).normalize();
      _v3.addScaledVector(n, -_v3.dot(n)).normalize();
      var ex = _v1.x + n.x * cosA * L1 + _v3.x * sinA * L1;
      var ey = _v1.y + n.y * cosA * L1 + _v3.y * sinA * L1;
      var ez = _v1.z + n.z * cosA * L1 + _v3.z * sinA * L1;
      _q1.setFromUnitVectors(DOWN, _v2.set(ex - _v1.x, ey - _v1.y, ez - _v1.z).normalize());
      arm.shoulder.quaternion.copy(_q1);
      var wx = _v1.x + n.x * dist, wy = _v1.y + n.y * dist, wz = _v1.z + n.z * dist;
      var qE = new THREE.Quaternion().setFromUnitVectors(DOWN, new THREE.Vector3(wx - ex, wy - ey, wz - ez).normalize());
      arm.elbow.quaternion.copy(_q1.clone().invert().multiply(qE));
    }

    function palmQuat(palm, side, out) {
      var e = new THREE.Euler();
      if (palm === 'down') e.set(Math.PI / 2, 0, 0);
      else if (palm === 'up') e.set(-Math.PI / 2, 0, 0);
      else if (palm === 'in') e.set(0, -side * Math.PI / 2, 0);
      else if (palm === 'out') e.set(0, side * Math.PI / 2, 0);
      out.setFromEuler(e);
      return out;
    }

    var _pq = new THREE.Quaternion(), _pqT = new THREE.Quaternion();
    function applyHand(arm, st, k) {
      // st: live state, k: 0..1 blend toward target happens before this call
      solveArm(arm, st.t[0], st.t[1], st.t[2]);
      var c = st.curl, names = ['I', 'M', 'R', 'P'];
      for (var i = 0; i < 4; i++) {
        var f = arm.fingers[i], v = c[names[i]];
        f.base.rotation.x = -v * 1.15;
        f.mid.rotation.x = -v * 1.40;
        f.tip.rotation.x = -v * 0.85;
        f.base.rotation.z = (i - 1.5) * 0.10 * c.spread;
      }
      arm.thumb.base.rotation.x = -c.T * 0.85;
      arm.thumb.mid.rotation.x = -c.T * 0.7;
      palmQuat(st.palm, arm.side, _pqT);
      arm.wrist.quaternion.slerp(_pqT, 0.45);
      if (st.wristTwist) arm.wrist.rotateZ(st.wristTwist);
    }

    function applyFace(name) {
      // Sign-language grammar on a realistic face: brows lift for questions
      // and furrow for emphasis, eyes widen slightly, the mouth opens or
      // stretches with the sentiment. Kept natural, not exaggerated.
      var q = name === 'question', e = name === 'emphasis', p = name === 'positive';
      var by = q ? 0.060 : e ? 0.044 : 0.050;
      browL.position.y = by; browR.position.y = by;
      browL.rotation.z = BROW_Z + 0.10 + (q ? 0.20 : e ? -0.24 : 0);
      browR.rotation.z = BROW_Z - 0.10 + (q ? -0.20 : e ? 0.24 : 0);
      mouth.scale.set(mouthBaseX * (p ? 1.3 : q ? 0.85 : 1) * (1 + smileBase * 0.10),
        (p ? 1.25 : q ? 0.9 : 1) + smileBase * 0.30, 1);
      var es = q ? 1.15 : e ? 1.06 : 1;
      var ey = es * (blinkScale || 1);
      eyeL.white.scale.set(EYE_SX * es, EYE_SY * ey, EYE_SZ);
      eyeR.white.scale.set(EYE_SX * es, EYE_SY * ey, EYE_SZ);
    }

    // Item -> full target pose (both hands + face).
    function shapeFor(name) {
      return HANDSHAPES[name] ? Object.assign({}, HANDSHAPES[name]) : Object.assign({}, HANDSHAPES.flat);
    }
    function itemTarget(item) {
      var t = {
        R: { t: REST.R.t.slice(), curl: shapeFor('cup'), palm: REST.R.palm },
        L: { t: REST.L.t.slice(), curl: shapeFor('cup'), palm: REST.L.palm },
        face: item.face || 'neutral',
      };
      // relax the default cup
      t.R.curl = { I: 0.25, M: 0.25, R: 0.3, P: 0.35, T: 0.3, spread: 0.25 };
      t.L.curl = { I: 0.25, M: 0.25, R: 0.3, P: 0.35, T: 0.3, spread: 0.25 };
      if (item.type === 'letter') {
        var pr = item.preset;
        // Data space: +x = character's right (fingerspell station). Negate x
        // for the driver, same as waypoints above.
        t.R = {
          t: [-0.24, 0.22, 0.26], curl: { I: pr.I, M: pr.M, R: pr.R, P: pr.P, T: pr.T, spread: pr.spread || 0 },
          palm: pr.wrist === 'down' ? 'down' : 'fwd', motion: pr.motion || null, motionT: 0,
        };
        if (item.support) {
          var s = item.support;
          var off = item.supportPos || [0.02, -0.05, -0.05];
          t.L = {
            t: [-(0.24 + off[0]), 0.22 + off[1], 0.26 + off[2]],
            curl: s.curl, palm: s.palm,
          };
        }
      } else if (item.type === 'wp') {
        var wp = item.wp;
        // Sign space (+x = character's right, per sign-schema3d.md) is the
        // mirror image of driver screen space (+x = viewer's right): negate
        // x on every data -> driver mapping or signs render left-right
        // flipped against the reference videos.
        var dx = function (pt) { return [-pt[0], pt[1], pt[2]]; };
        var put = function (side, pt) {
          t[side] = { t: dx(pt), curl: shapeFor(wp.shape), palm: wp.palm || 'fwd' };
        };
        if (wp.h === 'R') put('R', wp.p);
        else if (wp.h === 'L') put('L', wp.p);
        else {
          put('R', wp.p);
          put('L', wp.p2 ? wp.p2 : [-wp.p[0], wp.p[1], wp.p[2]]);
        }
      }
      return t;
    }

    // Animation driver: one rAF loop, queue of items, move->hold per item.
    var queue = [];
    var active = null; // {item, target, phase, start, dur, holdMs}
    var lastSignEnd = 0; // when the last queued item finished (rest delay)
    var lastBlink = 0, blinkUntil = 0;

    function enqueue(items) {
      token++;
      queue = items.slice();
      active = null;
    }

    function moveDur(from, to) {
      var d = 0;
      ['R', 'L'].forEach(function (s) {
        var dx = from[s].t[0] - to[s].t[0], dy = from[s].t[1] - to[s].t[1], dz = from[s].t[2] - to[s].t[2];
        d = Math.max(d, Math.sqrt(dx * dx + dy * dy + dz * dz));
      });
      // Longer glides than the old 180+700d/480 cap: real signing hands
      // travel, they don't teleport between poses.
      return clamp(240 + d * 860, 260, 620);
    }

    var arcApplied = { R: 0, L: 0 }; // per-frame arc lift, removed after applyHand
    function tick(now) {
      if (destroyed) return;
      requestAnimationFrame(tick);
      if (!active && queue.length) {
        var item = queue.shift();
        var target = itemTarget(item);
        active = { item: item, target: target, phase: 'move', start: now, dur: moveDur(cur, target),
                   holdMs: item.holdMs || 300, fromR: cur.R.t.slice(), fromL: cur.L.t.slice(), nextTarget: null };
        faceTarget = target.face;
      }
      arcApplied.R = 0; arcApplied.L = 0;
      if (active) {
        var el = now - active.start;
        if (active.phase === 'move') {
          var t = sstep(el / active.dur);
          blendPose(cur, active.target, t);
          // Arc lift: hands bow outward toward the viewer mid-travel
          // (the sign data's own `arc` field where authored, a gentle
          // default otherwise) instead of sliding in straight lines.
          var lift = Math.sin(Math.PI * Math.min(1, el / active.dur));
          var arcBase = (active.item.wp && typeof active.item.wp.arc === 'number') ? active.item.wp.arc : 0.05;
          [['R', active.fromR], ['L', active.fromL]].forEach(function (pr) {
            var s = pr[0], from = pr[1], tg = active.target[s].t;
            var dd = Math.sqrt(Math.pow(tg[0] - from[0], 2) + Math.pow(tg[1] - from[1], 2) + Math.pow(tg[2] - from[2], 2));
            if (dd > 0.04) {
              arcApplied[s] = clamp(arcBase + dd * 0.12, 0, 0.13) * lift;
              cur[s].t[2] += arcApplied[s];
            }
          });
          if (t >= 1) { active.phase = 'hold'; active.start = now; }
        } else {
          // Hold, with co-articulation: in the second half of the hold,
          // start gliding toward the next queued pose so signs flow
          // into each other instead of stopping dead between items —
          // the single biggest difference between robotic and natural.
          var pre = queue.length && el > active.holdMs * 0.5;
          if (!pre) {
            blendPose(cur, active.target, 1);
          } else {
            if (!active.nextTarget) active.nextTarget = itemTarget(queue[0]);
            blendPose(cur, active.nextTarget, sstep((el - active.holdMs * 0.5) / (active.holdMs * 0.5)) * 0.65);
          }
          var mo = active.target.R.motion;
          cur.R.wristTwist = 0;
          if (mo) {
            var mt = (now - active.start) / 1000;
            if (mo === 'twist') cur.R.wristTwist = Math.sin(mt * 9) * 0.45;
            else if (mo === 'zdraw') {
              cur.R.t[0] = -0.24 + Math.sin(mt * 7) * 0.035;
              cur.R.t[1] = 0.22 + Math.cos(mt * 3.5) * 0.02;
            }
          }
          if (el >= active.holdMs) { active = null; lastSignEnd = now; }
        }
      } else if (!queue.length) {
        // After signing, hold the final pose a beat, then relax slowly —
        // an instant snap back to rest reads as robotic.
        if (now - lastSignEnd > 700) blendPose(cur, REST, 0.03);
        faceTarget = 'neutral';
      }
      // letter motion needs a persistent wristTwist field reset each frame
      applyHand(armR, cur.R);
      cur.R.wristTwist = 0;
      applyHand(armL, cur.L);
      cur.R.t[2] -= arcApplied.R; cur.L.t[2] -= arcApplied.L;
      applyFace(faceTarget);
      rbRetarget(); // Rocketbox: transfer driver deltas to the humanoid (no-op when off)
      // blink: shared scale factor consumed by applyFace below
      if (now - lastBlink > 3200 + (lastBlink % 1300)) { blinkUntil = now + 130; lastBlink = now; }
      blinkScale = now < blinkUntil ? 0.12 : 1;
      // breathing + a gentle cartoon sway
      torso.position.y = Math.sin(now / 1000 * 1.4) * 0.006;
      torso.rotation.z = Math.sin(now / 1000 * 0.7) * 0.012;
      headG.rotation.y = Math.sin(now / 1000 * 0.5) * 0.05;
      headG.rotation.z = Math.sin(now / 1000 * 0.9) * 0.03;
      // VRM idle life: the model must breathe and sway too, or she reads
      // as a mannequin between signs. Subtle wrap bob + head micro-sway
      // around the bind pose captured at load.
      if (rb && rb.model === 'vrm' && rb.wrap && typeof rb.baseY === 'number') {
        var bt = now / 1000;
        rb.wrap.position.y = rb.baseY + Math.sin(bt * 1.4) * 0.0035;
        rb.wrap.rotation.z = Math.sin(bt * 0.7) * 0.004;
        if (rb.headBone && rb.headBind) {
          _q1.setFromEuler(new THREE.Euler(Math.sin(bt * 0.43) * 0.03, Math.sin(bt * 0.31) * 0.05, Math.sin(bt * 0.53) * 0.02));
          rb.headBone.quaternion.copy(rb.headBind).multiply(_q1);
        }
        if (rb.neckBone && rb.neckBind) {
          _q1.setFromEuler(new THREE.Euler(Math.sin(bt * 0.43) * 0.015, Math.sin(bt * 0.31) * 0.025, Math.sin(bt * 0.53) * 0.01));
          rb.neckBone.quaternion.copy(rb.neckBind).multiply(_q1);
        }
      }
      vrmApplyFace();
      renderer.render(scene, camera);
    }

    function blendPose(dst, src, t) {
      ['R', 'L'].forEach(function (s) {
        for (var i = 0; i < 3; i++) dst[s].t[i] = lerp(dst[s].t[i], src[s].t[i], t);
        var keys = ['I', 'M', 'R', 'P', 'T', 'spread'];
        keys.forEach(function (kk) {
          // Never let a malformed target poison the live pose with NaN.
          if (typeof src[s].curl[kk] === 'number' && isFinite(src[s].curl[kk])) {
            dst[s].curl[kk] = lerp(dst[s].curl[kk], src[s].curl[kk], t);
          }
        });
        if (t >= 1) dst[s].palm = src[s].palm;
        dst[s].motion = src[s].motion || null;
      });
    }

    function resize() {
      var w = canvas.clientWidth || 320, h = canvas.clientHeight || 380;
      var dpr = Math.min(typeof window !== 'undefined' && window.devicePixelRatio || 1, 2);
      var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw; canvas.height = bh;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }

    /* ---------------- public API ---------------- */

    // Honesty report for the last play()/playMore() batch: every input word
    // must produce a visible beat. Letters with no manual-alphabet preset in
    // the target language are NEVER silently skipped — they become a marked
    // rest beat and are listed here so the UI can say so out loud.
    var lastReport = null;
    function newReport() {
      return { language: language, words: 0, letters: 0, missingWords: [], missingLetters: [] };
    }
    function noteMissing(rep, arr, v) {
      if (rep[arr].indexOf(v) < 0) rep[arr].push(v);
    }
    function missingLetterItem(ch, holdMs) {
      return { type: 'rest', holdMs: holdMs || 260, missingLetter: ch };
    }

    function buildItems(list, holdMs, rep) {
      var items = [];
      for (var i = 0; i < list.length; i++) {
        var p = parseToken(list[i]);
        if (p.kind === 'sign') {
          rep.words++;
          var r = resolveSign(p.gloss, language);
          if (r.waypoints && !(r.fallback === 'asl' && language !== 'asl')) {
            r.waypoints.forEach(function (wp) {
              items.push({ type: 'wp', wp: wp, holdMs: Math.min(750, Math.round((wp.hold || (typeof holdMs === 'number' && holdMs > 0 ? Math.min(holdMs, 600) : 320)) * 1.3)), face: wp.face });
            });
          } else {
            // Honest fallback: fingerspell the unknown word letter by letter.
            // For BSL/PSL we NEVER play an ASL sign as if it were the target
            // language — the word is spelled in the target language's own
            // manual alphabet instead. The same rule covers every pack:
            // packs without authored sign data fingerspell only, in their
            // own manual alphabet where one is implemented; packs whose
            // alphabet is not implemented (manualAlphabet: null) get marked
            // rest beats — never another language's letters.
            noteMissing(rep, 'missingWords', p.gloss);
            var word = p.gloss.replace(/[^A-Z0-9]/g, '');
            var fsLang = fingerspellLangFor(language);
            for (var c = 0; c < word.length; c++) {
              var lp = fsLang ? letterPreset(word[c], fsLang) : { preset: null };
              if (lp.preset) { rep.letters++; items.push(letterItem(word[c], lp, 430, fsLang)); }
              else { noteMissing(rep, 'missingLetters', word[c]); items.push(missingLetterItem(word[c])); }
            }
          }
        } else if (p.kind === 'fingerspell') {
          var txt = p.text.replace(/[^A-Z0-9]/g, '');
          for (var d = 0; d < txt.length; d++) {
            var lp2 = letterPreset(txt[d], p.lang);
            if (lp2.preset) { rep.letters++; items.push(letterItem(txt[d], lp2, 430, p.lang)); }
            else { noteMissing(rep, 'missingLetters', txt[d]); items.push(missingLetterItem(txt[d], 200)); }
          }
        } else {
          items.push({ type: 'rest', holdMs: typeof holdMs === 'number' && holdMs > 0 ? holdMs : 500 });
        }
      }
      return items;
    }

    /** Replace the queue (new utterance: latest wins). */
    function play(glosses, holdMs) {
      lastReport = newReport();
      var items = buildItems(glosses || [], holdMs, lastReport);
      if (items.length) enqueue(items);
    }

    /**
     * Append to the queue (real-time word streaming: signs stay in order).
     * Caps the backlog so a fast speaker can't push the avatar minutes behind:
     * oldest queued items drop first; the live word is never dropped.
     */
    function playMore(glosses, holdMs) {
      lastReport = lastReport || newReport();
      var items = buildItems(glosses || [], holdMs, lastReport);
      if (!items.length) return;
      queue = queue.concat(items);
      var MAXQ = 48;
      if (queue.length > MAXQ) queue.splice(0, queue.length - MAXQ);
    }

    function letterItem(ch, lp, holdMs, spellLang) {
      // Preset schemas differ by alphabet: ASL presets are flat
      // ({I,M,R,P,T,spread}); BSL/PSL presets nest the curls under .shape
      // ({shape:{...}, support, supportPos}). Normalize to the flat form
      // here — reading .I off a nested preset yields undefined curls,
      // which used to poison the live pose with NaN and freeze the hand.
      var raw = lp.preset || {};
      var flat = raw.shape ? Object.assign({}, raw.shape) : Object.assign({}, raw);
      ['I', 'M', 'R', 'P', 'T', 'spread'].forEach(function (kk) {
        if (typeof flat[kk] !== 'number' || !isFinite(flat[kk])) flat[kk] = 0;
      });
      var item = { type: 'letter', ch: ch, lang: lp.lang, preset: flat, holdMs: holdMs || 430, face: 'neutral' };
      if (lp.preset && lp.preset.support) {
        var sup = lp.preset.support;
        var curl = sup === 'fist' ? shapeFor('fist') : shapeFor('flat');
        item.support = { curl: curl, palm: sup === 'flat-up' ? 'up' : sup === 'flat-fwd' ? 'fwd' : 'fwd' };
        item.supportPos = lp.preset.supportPos || [0.02, -0.05, -0.05];
      } else if (spellLang === 'bsl' || spellLang === 'psl') {
        // Two-handed alphabets (BSL/PSL): the support hand is held flat,
        // palm up, under the dominant hand for EVERY letter — that is the
        // documented support posture of the system (see the vowel entries
        // in fingerspell3d.js). Letters whose dominant-hand shape is not
        // yet authored keep their existing fallback shape; this only
        // guarantees both hands work while spelling, as they should.
        item.support = { curl: shapeFor('flat'), palm: 'up' };
        item.supportPos = [0.02, -0.05, -0.05];
      }
      return item;
    }

    function stop() {
      token++;
      queue = [];
      active = null;
    }

    function setAvatar(name) {
      var a = AVATARS[name] || AVATARS.nia;
      avatar = a;
      avatarKey = (name && AVATARS[name]) ? name : 'nia';
      mats.skin.color.setHex(a.skin);
      mats.shirt.color.setHex(a.shirt);
      mats.hair.color.setHex(a.hair);
      mats.lip.color.setHex(a.lip);
      mats.vest.color.setHex(a.vest || a.shirt);
      mats.iris.color.setHex(0xffffff);
      if (mats.iris.map) { try { mats.iris.map.dispose(); } catch (e) {} }
      mats.iris.map = makeIrisTexture(a.eye || 0x4a2e1a);
      mats.iris.needsUpdate = true;
      mats.stubble.opacity = a.stubble || 0;
      mouthBaseX = a.mouthScale || 1;
      smileBase = a.smile || 0;
      // Brows: slimmer and more arched on the women, fuller on the men.
      var bt = a.female ? 0.68 : 1.0;
      browL.scale.set(bt, 1, bt); browR.scale.set(bt, 1, bt);
      // Blush only on the women.
      blushL.visible = !!a.female; blushR.visible = !!a.female;
      // Per-avatar eye presence: Nia's big expressive eyes vs. Elias's
      // narrower ones; lashes only on the women.
      var eyeS = a.eyeScale || 1;
      eyeL.group.scale.set(eyeS, eyeS, 1);
      eyeR.group.scale.set(eyeS, eyeS, 1);
      eyeL.lashes.visible = !!a.female;
      eyeR.lashes.visible = !!a.female;
      buildHair(a.hairStyle);
      buildOutfit();
      buildArms();
      if (vrmMode && avatarKey === 'nia') {
        // Fresh driver arm objects: recapture REST, then load the VRM
        // anime model. Synchronous capture first, so no frame renders
        // with a half-built rig.
        rbCaptureDriverRest();
        vrmLoad();
      } else if (rbMode) {
        rbCaptureDriverRest();
        rbLoad(rbModelFor(avatarKey));
      } else if (vrmMode) {
        vrmUnload();
      }
    }

    function setLanguage(lang) {
      // Any registered pack code is accepted (registry: sign-languages.js).
      // asl/bsl/psl sign from their authored data; other packs fingerspell
      // only, in their manual alphabet where implemented. Unknown -> asl.
      if (lang === 'asl' || lang === 'bsl' || lang === 'psl' || packInfo(lang) || FS_FAMILY[lang]) {
        language = lang;
      } else {
        language = 'asl';
      }
    }

    function destroy() {
      destroyed = true;
      stop();
      if (rb) { try { rb.token = (rb.token || 0) + 1; } catch (e) {} } // cancel in-flight loads
      rbFallback();
      try {
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
          window.removeEventListener('resize', resize);
        }
      } catch (e) { /* ignore */ }
      scene.traverse(function (o) {
        if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
        if (o.material) { try { o.material.dispose(); } catch (e) {} }
      });
      try { renderer.dispose(); } catch (e) {}
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', resize);
    }
    setAvatar(avatarName || 'nia');
    resize();
    requestAnimationFrame(tick);

    return {
      ready: true, is3d: true,
      setAvatar: setAvatar, setLanguage: setLanguage,
      play: play, playMore: playMore, stop: stop, destroy: destroy,
      getLastReport: function () { return lastReport ? JSON.parse(JSON.stringify(lastReport)) : null; },
      // Debug helper: report Rocketbox load/material state for verification.
      rbDebug: function () {
        var info = { rbMode: rbMode, hasRb: !!rb, ready: !!(rb && rb.ready), model: rb && rb.model, rigVisible: rig.visible, meshes: [] };
        if (rb && rb.wrap) rb.wrap.traverse(function (o) {
          if (o.isMesh || o.isSkinnedMesh) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) {
              if (!mt) return;
              info.meshes.push({ name: mt.name, color: mt.color ? mt.color.getHexString() : '?', hasMap: !!(mt.map && mt.map.image), mapW: mt.map && mt.map.image ? mt.map.image.width : 0 });
            });
          }
        });
        return info;
      },
      // Debug helper: paint the Rocketbox wrap with flat basic materials.
      rbPaint: function (hex) {
        if (!(rb && rb.wrap)) return false;
        rb.wrap.traverse(function (o) {
          if (o.isMesh || o.isSkinnedMesh) {
            o.material = new THREE.MeshBasicMaterial({ color: hex, skinning: !!o.isSkinnedMesh });
          }
        });
        return true;
      },
      // Debug helper: sample driver vs bone world orientation.
      rbProbe: function () {
        if (!(rb && rb.ready) || !rb.pairs.length) return { ready: false };
        var pr = rb.pairs[0];
        rig.updateMatrixWorld(true);
        var dq = pr.driver.getWorldQuaternion(new THREE.Quaternion());
        var bq = pr.bone.getWorldQuaternion(new THREE.Quaternion());
        function fmt(q) { return [q.x, q.y, q.z, q.w].map(function (v) { return +v.toFixed(3); }).join(','); }
        return { ready: true, pairs: rb.pairs.length, driver: fmt(dq), bone: fmt(bq), active: !!active, queue: queue.length };
      },
      // Debug helper: frame the signing hand for close-up verification.
      frameHand: function () {
        if (rb && rb.ready) {
          var b = rbFindBone(rb.wrap, 'Bip01_L_Hand');
          if (b) {
            var p = new THREE.Vector3(); b.getWorldPosition(p);
            camera.position.set(p.x + 0.12, p.y + 0.10, p.z + 0.55);
            camera.lookAt(p.x, p.y, p.z);
            return;
          }
        }
        camera.position.set(0.35, 0.30, 0.9);
        camera.lookAt(0.25, 0.12, 0.15);
      },
      // Debug helper: frame the camera on the face for close-up verification.
      frameFace: function () {
        camera.position.set(0, 0.565, 0.52);
        camera.lookAt(0, 0.55, 0.02);
      },
      // Debug helper: head-and-torso portrait framing, like the reference.
      framePortrait: function () {
        camera.position.set(0, 0.36, 1.15);
        camera.lookAt(0, 0.34, 0);
      },
      frameBody: function () {
        camera.position.set(0, 0.30, 1.55);
        camera.lookAt(0, 0.25, 0);
      },
    };
  }

  if (typeof window !== 'undefined') window.createSigner3DEngine = createSigner3DEngine;
})();
