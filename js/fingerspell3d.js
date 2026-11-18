/* voclynx 3D signer — fingerspelling alphabets.
 *
 * Authored 2026-09-26 from real ASL/BSL manual-alphabet knowledge.
 * Curl values: 0 = fully extended, 1 = fully curled. spread: 0 = together, 1 = wide.
 *
 * HONESTY NOTE: the ASL alphabet (one-handed) and ASL digits are complete and
 * confident. The BSL alphabet (two-handed) is PARTIAL: only the five vowels
 * (A, E, I, O, U) are included, because those are the letters the author knows
 * with confidence (dominant index points to the fingertip of the flat support
 * hand: thumb=A, index=E, middle=I, ring=O, pinky=U). Every other BSL letter
 * is listed in VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW below and is NOT in the
 * tables — a partial honest alphabet beats a full invented one.
 *
 * Known approximations (curl-only format cannot express everything):
 *  - M/N/T/S/A differ partly in WHERE the thumb sits (under 3 / 2 / 1 finger,
 *    across the front, alongside the fist). Thumb curl gradations below are an
 *    approximation; the engine should refine thumb placement per letter.
 *  - R (fingers crossed) and P/Q (palm orientation) need orientation data the
 *    letter format does not carry; noted per letter.
 *  - BSL supportPos offsets are approximate geometry for "point at fingertip".
 */

window.VOCLYNX_FINGERSPELL3D = {
  // ---------------- ASL: one-handed alphabet (26 letters) ----------------
  asl: {
    // A: fist, thumb up alongside the index side of the fist
    "A": { I: 1, M: 1, R: 1, P: 1, T: 0.15, spread: 0.1 },
    // B: flat hand, fingers together, thumb bent across the palm
    "B": { I: 0, M: 0, R: 0, P: 0, T: 0.8, spread: 0.1 },
    // C: curved hand, open C shape
    "C": { I: 0.45, M: 0.45, R: 0.45, P: 0.45, T: 0.45, spread: 0.25 },
    // D: index up, other fingers folded, thumb tip touching middle fingertip
    "D": { I: 0, M: 1, R: 1, P: 1, T: 0.6, spread: 0 },
    // E: all fingers curled tight, thumb across the fingertips
    "E": { I: 1, M: 1, R: 1, P: 1, T: 1, spread: 0 },
    // F: index + thumb form a circle, other three fingers up
    "F": { I: 0.55, M: 0, R: 0, P: 0, T: 0.55, spread: 0.15 },
    // G: thumb and index extended close together, pointing sideways
    "G": { I: 0, M: 1, R: 1, P: 1, T: 0.1, spread: 0.05 },
    // H: index + middle extended sideways, thumb across folded fingers
    "H": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.15 },
    // I: pinky up, rest of fist closed, thumb across
    "I": { I: 1, M: 1, R: 1, P: 0, T: 0.9, spread: 0 },
    // J: I-handshape with a wrist twist (engine: motion "twist")
    "J": { I: 1, M: 1, R: 1, P: 0, T: 0.9, spread: 0, motion: "twist" },
    // K: V hand with thumb up between index and middle
    "K": { I: 0, M: 0, R: 1, P: 1, T: 0.4, spread: 0.45 },
    // L: index up, thumb out at right angle
    "L": { I: 0, M: 1, R: 1, P: 1, T: 0.1, spread: 0.5 },
    // M: fist, thumb tucked UNDER index+middle+ring (approx: full thumb curl)
    "M": { I: 1, M: 1, R: 1, P: 1, T: 1, spread: 0 },
    // N: fist, thumb tucked UNDER index+middle (approx: near-full thumb curl)
    "N": { I: 1, M: 1, R: 1, P: 1, T: 0.95, spread: 0 },
    // O: rounded — all fingertips meeting the thumb in a circle
    "O": { I: 0.7, M: 0.7, R: 0.7, P: 0.7, T: 0.7, spread: 0.2 },
    // P: K-handshape pointing down (palm down; curls same as K)
    "P": { I: 0, M: 0, R: 1, P: 1, T: 0.4, spread: 0.45 },
    // Q: G-handshape pointing down (curls same as G)
    "Q": { I: 0, M: 1, R: 1, P: 1, T: 0.1, spread: 0.05 },
    // R: index CROSSED OVER middle, both up (crossing needs engine support)
    "R": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0 },
    // S: fist, thumb across the FRONT of the fingers
    "S": { I: 1, M: 1, R: 1, P: 1, T: 0.7, spread: 0 },
    // T: fist, thumb tucked BETWEEN index and middle (approx: high thumb curl)
    "T": { I: 1, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    // U: index + middle up together, thumb across folded fingers
    "U": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0 },
    // V: index + middle up and spread
    "V": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.5 },
    // W: index + middle + ring up and spread
    "W": { I: 0, M: 0, R: 0, P: 1, T: 0.9, spread: 0.4 },
    // X: index hooked (half-bent), rest of fist closed
    "X": { I: 0.5, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    // Y: thumb and pinky extended (like I but thumb out)
    "Y": { I: 1, M: 1, R: 1, P: 0, T: 0.1, spread: 0.4 },
    // Z: index extended, fingertip traces a Z (engine: motion "zdraw")
    "Z": { I: 0, M: 1, R: 1, P: 1, T: 0.7, spread: 0, motion: "zdraw" }
  },

  // ---------------- ASL digits 0-9 (distinct handshapes) ----------------
  aslDigits: {
    // 0: O-handshape
    "0": { I: 0.7, M: 0.7, R: 0.7, P: 0.7, T: 0.7, spread: 0.2 },
    // 1: index up, thumb across folded fingers
    "1": { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 },
    // 2: V handshape (palm in for numbers 1-2; curls as shown)
    "2": { I: 0, M: 0, R: 1, P: 1, T: 0.9, spread: 0.5 },
    // 3: thumb + index + middle (thumb across palm, three fingers up)
    "3": { I: 0, M: 0, R: 0, P: 1, T: 0.85, spread: 0.4 },
    // 4: four fingers up, thumb across palm
    "4": { I: 0, M: 0, R: 0, P: 0, T: 0.85, spread: 0.45 },
    // 5: open hand, fingers spread
    "5": { I: 0, M: 0, R: 0, P: 0, T: 0.2, spread: 0.8 },
    // 6: thumb tip touches pinky tip, three fingers up
    "6": { I: 0, M: 0, R: 0, P: 0.6, T: 0.6, spread: 0.3 },
    // 7: thumb tip touches ring fingertip, index+middle up, pinky folded
    "7": { I: 0, M: 0, R: 0.6, P: 1, T: 0.6, spread: 0.3 },
    // 8: thumb tip touches middle fingertip, index up, ring+pinky folded
    "8": { I: 0, M: 0.6, R: 1, P: 1, T: 0.6, spread: 0.25 },
    // 9: thumb tip touches index (F-like)
    "9": { I: 0.55, M: 0, R: 0, P: 0, T: 0.55, spread: 0.2 }
  },

  // ---------------- BSL: two-handed alphabet (PARTIAL — vowels only) -----
  // Dominant (right) hand points with the index at a fingertip of the flat
  // support (left) hand, palm up. supportPos is the support-hand center
  // relative to the dominant-hand target; per-vowel offsets put the correct
  // fingertip under the pointing index (approximate geometry).
  bsl: {
    // A: point to the tip of the support thumb
    "A": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [0.06, -0.06, -0.04] },
    // E: point to the tip of the support index finger
    "E": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [0.03, -0.05, -0.09] },
    // I: point to the tip of the support middle finger
    "I": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [0.01, -0.05, -0.10] },
    // O: point to the tip of the support ring finger
    "O": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [-0.01, -0.05, -0.09] },
    // U: point to the tip of the support little finger
    "U": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [-0.03, -0.05, -0.08] }
  },

  // ---------------- PSL: two-handed alphabet (PARTIAL — vowels only) --------
  // Pakistan Sign Language uses a two-handed manual alphabet of British
  // origin (Wikipedia, "Fingerspelling": Indo-Pakistani Sign Language "currently
  // used a two-handed manual alphabet of British origin"), so the PSL vowels
  // below are the same forms as the BSL vowels above. PSL consonants are NOT
  // authored yet — see VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW.
  psl: {
    // A: point to the tip of the support thumb
    "A": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [0.06, -0.06, -0.04] },
    // E: point to the tip of the support index finger
    "E": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [0.03, -0.05, -0.09] },
    // I: point to the tip of the support middle finger
    "I": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [0.01, -0.05, -0.10] },
    // O: point to the tip of the support ring finger
    "O": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [-0.01, -0.05, -0.09] },
    // U: point to the tip of the support little finger
    "U": { shape: { I: 0, M: 1, R: 1, P: 1, T: 0.9, spread: 0 }, support: "flat-up", supportPos: [-0.03, -0.05, -0.08] }
  }
};

/* Letters NOT authored — need review by a fluent BSL user before inclusion.
 * Unverified recollections (do NOT encode as data yet):
 *  - BSL C: dominant C-hand cupped around the support index finger.
 *  - BSL M: first three fingers of dominant hand resting on the support palm.
 *  - BSL N: index + middle of dominant hand resting on the support palm.
 *  - BSL Z: dominant index draws a Z on the support palm.
 *  - BSL S: dominant fist placed on the support palm.
 *  - BSL B/D/F/G/H/J/K/L/P/Q/R/T/V/W/X/Y: no confident recollection.
 */
window.VOCLYNX_FINGERSPELL3D_NEEDS_REVIEW = [
  "BSL:B", "BSL:C", "BSL:D", "BSL:F", "BSL:G", "BSL:H", "BSL:J",
  "BSL:K", "BSL:L", "BSL:M", "BSL:N", "BSL:P", "BSL:Q", "BSL:R",
  "BSL:S", "BSL:T", "BSL:V", "BSL:W", "BSL:X", "BSL:Y", "BSL:Z",
  // PSL consonants: same British-origin two-handed alphabet as BSL; none
  // authored yet — need review by a fluent PSL signer before inclusion.
  "PSL:B", "PSL:C", "PSL:D", "PSL:F", "PSL:G", "PSL:H", "PSL:J",
  "PSL:K", "PSL:L", "PSL:M", "PSL:N", "PSL:P", "PSL:Q", "PSL:R",
  "PSL:S", "PSL:T", "PSL:V", "PSL:W", "PSL:X", "PSL:Y", "PSL:Z"
];
