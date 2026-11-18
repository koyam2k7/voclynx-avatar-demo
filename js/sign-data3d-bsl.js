/* voclynx 3D signer — BSL (British Sign Language) sign vocabulary.
 *
 * Loads AFTER sign-data3d.js and merges real BSL entries into
 * window.VOCLYNX_SIGNS3D.bsl. BSL is a distinct language from ASL: every
 * entry here was authored from real BSL knowledge, not adapted from the ASL
 * table. Glosses still listed as "BSL:<GLOSS>" in NEEDS_REVIEW keep falling
 * back to their ASL entry at runtime until authored.
 *
 * Coordinate frame: meters relative to the sternum, character facing viewer.
 * x: + = character's right | y: + = up, 0 = sternum | z: + = toward viewer.
 * Every target verified within 0.45 m of its shoulder (see schema).
 *
 * HONESTY NOTES (engine approximations — handshapes limited to 14 names):
 * - NAME uses "two" to approximate the BSL H-handshape (index+middle together
 *   tapping the forehead).
 * - NO uses "two" shaken side-to-side (BSL no = V-hand, palm out, wagged).
 * - PHONE and CALL share the BSL telephone hand (thumb to ear, pinky to
 *   mouth); in BSL the same sign covers both glosses.
 * - GOOD and THANK-YOU are related in BSL (both start at the chin): GOOD
 *   moves level-forward with palm turning forward; THANK-YOU moves
 *   forward-down with palm turning up. Distinction preserved in the paths.
 * - SEE approximates the BSL V-hand moving forward from the eyes.
 * - LISTEN approximates the BSL cupped hand held at the ear.
 * - DEAF approximates the BSL index finger indicating the ear.
 * - BSL wh-question signs (WHO/WHAT/WHEN/WHERE/WHY/HOW), time signs
 *   (NOW/TODAY/TOMORROW/MORNING/NIGHT/DAY/TIME), family/people signs beyond
 *   NAME/DEAF, BSL numbers 3/4/6-10, and verbs like UNDERSTAND/AGAIN/SLOW/HELP
 *   are NOT authored here — left in NEEDS_REVIEW for a fluent BSL signer.
 */

(function () {
  'use strict';
  var S = window.VOCLYNX_SIGNS3D;
  if (!S) return; // base data file (sign-data3d.js) must load first
  S.bsl = S.bsl || {};

  var BSL = {
    // ---- greetings ----
    // BSL HELLO: salute — flat-hand fingertips touch the forehead, then move away.
    "HELLO": [
      { h: "R", p: [0.10, 0.48, 0.12], shape: "flat", palm: "in", hold: 120, face: "positive" },
      { h: "R", p: [0.26, 0.44, 0.30], shape: "flat", palm: "in", hold: 380 }
    ],
    // BSL GOODBYE: friendly wave, palm toward viewer.
    "GOODBYE": [
      { h: "R", p: [0.30, 0.36, 0.24], shape: "flat", palm: "fwd", hold: 120, face: "positive" },
      { h: "R", p: [0.22, 0.36, 0.24], shape: "flat", palm: "fwd", hold: 150 },
      { h: "R", p: [0.32, 0.36, 0.24], shape: "flat", palm: "fwd", hold: 380 }
    ],

    // ---- courtesy ----
    // BSL PLEASE: flat hand circles on the chest.
    "PLEASE": [
      { h: "R", p: [0.04, 0.22, 0.17], shape: "flat", palm: "in", hold: 120 },
      { h: "R", p: [0.10, 0.16, 0.17], shape: "flat", palm: "in", hold: 150, arc: 0.10 },
      { h: "R", p: [0.04, 0.22, 0.17], shape: "flat", palm: "in", hold: 380, arc: 0.10 }
    ],
    // BSL THANK-YOU: fingertips touch the chin, hand moves forward and down, palm turns up.
    "THANK-YOU": [
      { h: "R", p: [0.04, 0.42, 0.15], shape: "flat", palm: "in", hold: 120, face: "positive" },
      { h: "R", p: [0.14, 0.32, 0.30], shape: "flat", palm: "up", hold: 380 }
    ],
    // BSL SORRY: fist circles on the chest (over the heart).
    "SORRY": [
      { h: "R", p: [0.08, 0.24, 0.17], shape: "fist", palm: "in", hold: 150, arc: 0.12 },
      { h: "R", p: [0.08, 0.16, 0.17], shape: "fist", palm: "in", hold: 150, arc: 0.12 },
      { h: "R", p: [0.08, 0.24, 0.17], shape: "fist", palm: "in", hold: 380, arc: 0.12 }
    ],

    // ---- yes / no ----
    // BSL YES: fist nods up and down like a nodding head.
    "YES": [
      { h: "R", p: [0.22, 0.34, 0.24], shape: "fist", palm: "in", hold: 120 },
      { h: "R", p: [0.22, 0.26, 0.24], shape: "fist", palm: "in", hold: 120 },
      { h: "R", p: [0.22, 0.34, 0.24], shape: "fist", palm: "in", hold: 380 }
    ],
    // BSL NO: V-hand (two fingers), palm out, wagged side to side.
    "NO": [
      { h: "R", p: [0.20, 0.32, 0.24], shape: "two", palm: "out", hold: 120 },
      { h: "R", p: [0.28, 0.32, 0.24], shape: "two", palm: "out", hold: 150 },
      { h: "R", p: [0.20, 0.32, 0.24], shape: "two", palm: "out", hold: 380 }
    ],

    // ---- people ----
    // BSL ME: index finger points to own chest.
    "ME": [
      { h: "R", p: [0.06, 0.24, 0.20], shape: "point", palm: "in", hold: 380 }
    ],
    // BSL YOU: index finger points forward at the viewer.
    "YOU": [
      { h: "R", p: [0.20, 0.28, 0.34], shape: "point", palm: "in", hold: 380 }
    ],
    // BSL NAME: H-hand (index+middle together) taps the forehead.
    "NAME": [
      { h: "R", p: [0.08, 0.50, 0.14], shape: "two", palm: "in", hold: 120 },
      { h: "R", p: [0.08, 0.49, 0.10], shape: "two", palm: "in", hold: 380 }
    ],
    // BSL DEAF: index finger indicates the ear.
    "DEAF": [
      { h: "R", p: [0.14, 0.45, 0.10], shape: "point", palm: "in", hold: 380 }
    ],

    // ---- call words ----
    // BSL telephone sign (covers CALL and PHONE): thumb to ear, pinky to mouth.
    "CALL": [
      { h: "R", p: [0.15, 0.42, 0.10], shape: "y-hand", palm: "in", hold: 380 }
    ],
    "PHONE": [
      { h: "R", p: [0.15, 0.42, 0.10], shape: "y-hand", palm: "in", hold: 380 }
    ],
    // BSL SEE: V-hand moves forward from the eyes.
    "SEE": [
      { h: "R", p: [0.10, 0.46, 0.14], shape: "two", palm: "fwd", hold: 120 },
      { h: "R", p: [0.16, 0.44, 0.30], shape: "two", palm: "fwd", hold: 380 }
    ],
    // BSL LISTEN: cupped hand held at the ear.
    "LISTEN": [
      { h: "R", p: [0.16, 0.42, 0.12], shape: "cup", palm: "in", hold: 380 }
    ],

    // ---- evaluation ----
    // BSL GOOD: flat hand at the chin moves level-forward, palm turning forward.
    "GOOD": [
      { h: "R", p: [0.04, 0.42, 0.15], shape: "flat", palm: "in", hold: 120, face: "positive" },
      { h: "R", p: [0.14, 0.40, 0.30], shape: "flat", palm: "fwd", hold: 380 }
    ],

    // ---- numbers (BSL 1, 2, 5 match the standard finger-count forms) ----
    "ONE": [
      { h: "R", p: [0.24, 0.34, 0.26], shape: "point", palm: "fwd", hold: 380 }
    ],
    "TWO": [
      { h: "R", p: [0.24, 0.34, 0.26], shape: "two", palm: "fwd", hold: 380 }
    ],
    "FIVE": [
      { h: "R", p: [0.24, 0.34, 0.26], shape: "splay", palm: "fwd", hold: 380 }
    ]
  };

  var authored = [];
  for (var g in BSL) {
    if (Object.prototype.hasOwnProperty.call(BSL, g)) {
      S.bsl[g] = BSL[g];
      authored.push(g);
    }
  }

  // Retire the "BSL:<GLOSS>" fallback placeholders for glosses now authored
  // for real; everything else stays in NEEDS_REVIEW.
  var NR = window.VOCLYNX_SIGNS3D_NEEDS_REVIEW;
  if (Array.isArray(NR)) {
    window.VOCLYNX_SIGNS3D_NEEDS_REVIEW = NR.filter(function (e) {
      var s = String(e);
      return !(s.indexOf("BSL:") === 0 && authored.indexOf(s.slice(4)) !== -1);
    });
  }

  // Expose the authored gloss list for tests/debugging.
  window.VOCLYNX_SIGNS3D_BSL_AUTHORED = authored.slice().sort();
})();
