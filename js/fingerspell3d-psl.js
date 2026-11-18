/* voclynx 3D signer — PSL (Pakistan Sign Language) fingerspelling.
 *
 * Loads AFTER fingerspell3d.js and merges the PSL manual alphabet and
 * digits into window.VOCLYNX_FINGERSPELL3D.
 *
 * Source / attribution (CC-BY-4.0): "sign-language-datasets" by
 * Mudassar Iqbal
 * (https://github.com/sign-language-translator/sign-language-datasets),
 * licensed CC-BY-4.0.
 *
 * The single-handed PSL manual alphabet (26 letters) was visually verified
 * September 2026 against the source recordings
 * (pk-hfad-1_<a-z>.single-handed-letter.mp4, Hamza Foundation Academy,
 * Lahore). Every letter's handshape matches the ASL handshape shown; the
 * curls below are set from the PSL videos, not copied blind. J shows the
 * wrist-twist and Z the z-draw in the source, hence motion "twist"/"zdraw".
 *
 * PSL digits 1/4/5/6/7/8/9 were verified against the source number
 * recordings (pk-hfad-1_<1,4,5,6,7,8,9>.mp4). Digits 6 and 9 are fists with
 * the thumb extended UP (6) / DOWN (9) in the source; the curl-only preset
 * cannot express thumb direction, so both use an extended thumb (T:0.1)
 * with the direction noted. Digits 0/2/3 have no verified recordings and
 * stay in VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW.
 *
 * This REPLACES the earlier placeholder two-handed PSL vowels (which were
 * Wikipedia-based, not video-verified) with the verified single-handed
 * alphabet. The obsolete "PSL:B".."PSL:Z" review entries for the two-handed
 * consonants are removed; ASL and BSL data are untouched.
 *
 * Curl values: 0 = fully extended, 1 = fully curled.
 * spread: 0 = together, 1 = wide.
 */
(function () {
  "use strict";

  // ---------------- PSL: single-handed alphabet (26 letters, verified) ----
  var PSL_LETTERS = {
    // A: fist, thumb up alongside the index side
    "A": { I: 1, M: 1, R: 1, P: 1, T: 0.15, spread: 0.1 },
    // B: flat hand, fingers together, thumb across the palm
    "B": { I: 0, M: 0, R: 0, P: 0, T: 0.8, spread: 0.1 },
    // C: curved open C shape
    "C": { I: 0.45, M: 0.45, R: 0.45, P: 0.45, T: 0.45, spread: 0.25 },
    // D: index up, others folded, thumb across
    "D": { I: 0, M: 1, R: 1, P: 1, T: 0.6, spread: 0 },
    // E: fingers curled tight, thumb across
    "E": { I: 1, M: 1, R: 1, P: 1, T: 1, spread: 0 },
    // F: index + thumb form a circle, other three fingers up
    "F": { I: 0.55, M: 0, R: 0, P: 0, T: 0.55, spread: 0.15 },
    // G: thumb and index extended close together, pointing sideways
    "G": { I: 0, M: 1, R: 1, P: 1, T: 0.1, spread: 0.05 },
    // H: index + middle extended sideways
    "H": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.15 },
    // I: pinky up, fist closed
    "I": { I: 1, M: 1, R: 1, P: 0, T: 0.9, spread: 0 },
    // J: I-handshape with a wrist twist (source shows the twist)
    "J": { I: 1, M: 1, R: 1, P: 0, T: 0.9, spread: 0, motion: "twist" },
    // K: V hand with thumb between index and middle
    "K": { I: 0, M: 0, R: 1, P: 1, T: 0.4, spread: 0.45 },
    // L: index up, thumb out at right angle
    "L": { I: 0, M: 1, R: 1, P: 1, T: 0.1, spread: 0.5 },
    // M: fist, thumb tucked under the fingers
    "M": { I: 1, M: 1, R: 1, P: 1, T: 1, spread: 0 },
    // N: fist, thumb tucked under index + middle
    "N": { I: 1, M: 1, R: 1, P: 1, T: 0.95, spread: 0 },
    // O: rounded — fingertips meeting the thumb in a circle
    "O": { I: 0.7, M: 0.7, R: 0.7, P: 0.7, T: 0.7, spread: 0.2 },
    // P: K-handshape pointing down
    "P": { I: 0, M: 0, R: 1, P: 1, T: 0.4, spread: 0.45 },
    // Q: G-handshape pointing down
    "Q": { I: 0, M: 1, R: 1, P: 1, T: 0.1, spread: 0.05 },
    // R: index crossed over middle, both up
    "R": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0 },
    // S: fist, thumb across the front
    "S": { I: 1, M: 1, R: 1, P: 1, T: 0.7, spread: 0 },
    // T: fist, thumb tucked between index and middle
    "T": { I: 1, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    // U: index + middle up together
    "U": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0 },
    // V: index + middle up and spread
    "V": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.5 },
    // W: index + middle + ring up and spread
    "W": { I: 0, M: 0, R: 0, P: 1, T: 0.9, spread: 0.4 },
    // X: index hooked (half-bent), fist closed
    "X": { I: 0.5, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    // Y: thumb and pinky extended
    "Y": { I: 1, M: 1, R: 1, P: 0, T: 0.1, spread: 0.4 },
    // Z: index extended, fingertip traces a Z (source shows the z-draw)
    "Z": { I: 0, M: 1, R: 1, P: 1, T: 0.7, spread: 0, motion: "zdraw" }
  };

  // ---------------- PSL digits (verified from number recordings) ----------
  var PSL_DIGITS = {
    // 1: index up (pk-hfad-1_1)
    "1": { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    // 4: four fingers up, thumb tucked (pk-hfad-1_4)
    "4": { I: 0, M: 0, R: 0, P: 0, T: 0.9, spread: 0.4 },
    // 5: open hand, fingers spread (pk-hfad-1_5)
    "5": { I: 0, M: 0, R: 0, P: 0, T: 0.1, spread: 0.6 },
    // 6: fist, thumb extended UP in the source (pk-hfad-1_6); the curl-only
    // preset cannot express thumb direction — thumb is extended here.
    "6": { I: 1, M: 1, R: 1, P: 1, T: 0.1, spread: 0 },
    // 7: thumb + index extended (pk-hfad-1_7)
    "7": { I: 0, M: 1, R: 1, P: 1, T: 0.15, spread: 0.5 },
    // 8: thumb + index circle, others extended (pk-hfad-1_8)
    "8": { I: 0.75, M: 0.15, R: 0.15, P: 0.15, T: 0.6, spread: 0 },
    // 9: fist, thumb extended DOWN in the source (pk-hfad-1_9); direction
    // not expressible in the preset — thumb is extended here.
    "9": { I: 1, M: 1, R: 1, P: 1, T: 0.1, spread: 0 }
  };

  // Merge into the shared global; ASL and BSL tables are untouched.
  window.VOCLYNX_FINGERSPELL3D = window.VOCLYNX_FINGERSPELL3D || {};
  window.VOCLYNX_FINGERSPELL3D.psl = PSL_LETTERS;
  window.VOCLYNX_FINGERSPELL3D.pslDigits = PSL_DIGITS;

  // Review list: drop the obsolete two-handed PSL consonant entries
  // (replaced by the verified single-handed alphabet above); add the
  // digits with no verified recordings. No duplicates.
  window.VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW =
    window.VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW || [];
  var nr = window.VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW;
  for (var i = nr.length - 1; i >= 0; i--) {
    if (/^PSL:[B-Z]$/.test(nr[i])) nr.splice(i, 1);
  }
  var add = ["PSL:0", "PSL:2", "PSL:3"];
  for (var j = 0; j < add.length; j++) {
    if (nr.indexOf(add[j]) === -1) nr.push(add[j]);
  }
})();
