/* voclynx 3D signer — core sign vocabulary (ASL + BSL waypoint data).
 *
 * Coordinate frame: meters relative to the sternum, character facing viewer.
 * x: + = character's right | y: + = up, 0 = sternum | z: + = toward viewer.
 * Every target is within 0.45 m of its shoulder (verified by validator).
 *
 * HONESTY NOTES (engine approximations — handshapes limited to the 14 engine names):
 * - FAMILY uses "ok" to approximate the F-handshape (thumb+index circle).
 * - FINE uses "l-hand" to approximate the thumb-out 1-handshape.
 * - NINE uses "l-hand" (thumb+index extended); TEN uses "fist" to approximate
 *   the A-hand, with a small bounce standing in for the wrist shake.
 * - NAME uses "two" for the H-handshape (index+middle together).
 * - NO uses splay->pinch to approximate the fingers closing onto the thumb.
 * - Asymmetric two-handed signs (NIGHT, WRITE, SLOW, MUSIC, LEARN, MONEY, STOP,
 *   ANSWER) use p2 for the left-hand target. The engine allows only ONE shape
 *   value per waypoint, so where the two hands differ the DOMINANT hand's
 *   handshape is the one authored (the meaningful articulator).
 * - Circular paths (PLEASE, SORRY, WHO, WHEN, THINK, COFFEE) are approximated
 *   with 2-3 waypoints plus the `arc` curve parameter.
 * - SCHOOL's clap, BOOK's opening, DOOR's swing, DAY's tilt, HURT's twist and
 *   FRIEND's interlock are approximated with position/palm/shape transitions.
 *
 * BSL: no BSL variants are authored in this file. Every gloss below currently
 * falls back to its ASL entry at runtime (see the fallback list in the comment
 * above window.VOCLYNX_SIGNS3D_NEEDS_REVIEW). BSL variants must be authored by
 * a fluent BSL signer before any BSL accuracy is claimed.
 */

window.VOCLYNX_SIGNS3D = {
  asl: {
    // ---- greetings ----
    "HELLO": [
      { h: "R", p: [0.10, 0.46, 0.16], shape: "flat", palm: "fwd", hold: 120 },
      { h: "R", p: [0.30, 0.46, 0.30], shape: "flat", palm: "fwd", hold: 380 }
    ],
    "GOOD-MORNING": [
      { h: "R", p: [0.05, 0.44, 0.16], shape: "flat", palm: "down", hold: 150 },
      { h: "R", p: [0.20, 0.30, 0.22], shape: "flat", palm: "down", hold: 150 },
      { h: "R", p: [0.18, 0.08, 0.20], shape: "flat", palm: "up", hold: 150 },
      { h: "R", p: [0.22, 0.30, 0.24], shape: "flat", palm: "up", hold: 380 }
    ],
    "GOODBYE": [
      { h: "R", p: [0.30, 0.34, 0.24], shape: "flat", palm: "fwd", hold: 120 },
      { h: "R", p: [0.22, 0.34, 0.24], shape: "flat", palm: "fwd", hold: 200 },
      { h: "R", p: [0.34, 0.34, 0.24], shape: "flat", palm: "fwd", hold: 380 }
    ],

    // ---- courtesy ----
    "PLEASE": [
      { h: "R", p: [0.05, 0.24, 0.18], shape: "flat", palm: "in", hold: 120 },
      { h: "R", p: [0.12, 0.18, 0.18], shape: "flat", palm: "in", hold: 120, arc: 0.10 },
      { h: "R", p: [0.05, 0.12, 0.18], shape: "flat", palm: "in", hold: 380 }
    ],
    "THANK-YOU": [
      { h: "R", p: [0.05, 0.42, 0.16], shape: "flat", palm: "in", hold: 120 },
      { h: "R", p: [0.16, 0.24, 0.28], shape: "flat", palm: "fwd", hold: 380 }
    ],
    "SORRY": [
      { h: "R", p: [0.08, 0.20, 0.17], shape: "fist", hold: 150, arc: 0.15 },
      { h: "R", p: [0.08, 0.14, 0.17], shape: "fist", hold: 380, arc: 0.15 }
    ],
    "YES": [
      { h: "R", p: [0.18, 0.20, 0.22], shape: "fist", palm: "in", hold: 150 },
      { h: "R", p: [0.18, 0.12, 0.22], shape: "fist", palm: "in", hold: 380 }
    ],
    "NO": [
      { h: "R", p: [0.08, 0.40, 0.16], shape: "splay", palm: "in", hold: 120 },
      { h: "R", p: [0.08, 0.40, 0.20], shape: "pinch", palm: "in", hold: 380 }
    ],

    // ---- questions ----
    "WHO": [
      { h: "R", p: [0.06, 0.44, 0.16], shape: "point", palm: "in", hold: 120, face: "question", arc: 0.10 },
      { h: "R", p: [-0.02, 0.40, 0.16], shape: "point", palm: "in", hold: 380, arc: 0.10 }
    ],
    "WHAT": [
      { h: "B", p: [0.30, 0.18, 0.22], shape: "flat", palm: "up", hold: 120, face: "question" },
      { h: "B", p: [0.30, 0.18, 0.22], shape: "pinch", palm: "up", hold: 380 }
    ],
    "WHEN": [
      { h: "R", p: [0.10, 0.46, 0.14], shape: "point", palm: "in", hold: 150, face: "question", arc: 0.12 },
      { h: "R", p: [-0.06, 0.42, 0.14], shape: "point", palm: "in", hold: 380, arc: 0.12 }
    ],
    "WHERE": [
      { h: "R", p: [0.24, 0.24, 0.24], shape: "point", palm: "fwd", hold: 120, face: "question" },
      { h: "R", p: [0.34, 0.24, 0.24], shape: "point", palm: "fwd", hold: 200 },
      { h: "R", p: [0.24, 0.24, 0.24], shape: "point", palm: "fwd", hold: 380 }
    ],
    "WHY": [
      { h: "R", p: [0.10, 0.46, 0.14], shape: "y-hand", palm: "in", hold: 120, face: "question" },
      { h: "R", p: [0.16, 0.30, 0.26], shape: "bent", palm: "in", hold: 380 }
    ],
    "HOW": [
      { h: "B", p: [0.20, 0.20, 0.24], shape: "fist", palm: "down", hold: 120, face: "question" },
      { h: "B", p: [0.20, 0.26, 0.24], shape: "fist", palm: "down", hold: 120 },
      { h: "B", p: [0.20, 0.20, 0.24], shape: "fist", palm: "down", hold: 380 }
    ],
    "QUESTION": [
      { h: "R", p: [0.16, 0.36, 0.24], shape: "point", palm: "fwd", hold: 150, face: "question", arc: 0.12 },
      { h: "R", p: [0.16, 0.22, 0.24], shape: "point", palm: "fwd", hold: 380, arc: 0.05 }
    ],

    // ---- time ----
    "NOW": [
      { h: "B", p: [0.24, 0.30, 0.24], shape: "y-hand", palm: "up", hold: 120 },
      { h: "B", p: [0.24, 0.14, 0.24], shape: "y-hand", palm: "up", hold: 380 }
    ],
    "TODAY": [
      { h: "B", p: [0.24, 0.30, 0.24], shape: "y-hand", palm: "up", hold: 120 },
      { h: "B", p: [0.24, 0.14, 0.24], shape: "y-hand", palm: "up", hold: 120 },
      { h: "R", p: [0.22, 0.20, 0.22], shape: "flat", palm: "in", hold: 380 }
    ],
    "TOMORROW": [
      { h: "R", p: [0.14, 0.42, 0.12], shape: "fist", palm: "in", hold: 150 },
      { h: "R", p: [0.30, 0.36, 0.28], shape: "fist", palm: "in", hold: 380 }
    ],
    "MORNING": [
      { h: "R", p: [0.18, 0.08, 0.20], shape: "flat", palm: "up", hold: 120 },
      { h: "R", p: [0.22, 0.30, 0.24], shape: "flat", palm: "up", hold: 380 }
    ],
    "NIGHT": [
      { h: "B", p: [0.10, 0.30, 0.22], p2: [-0.10, 0.16, 0.22], shape: "bent", palm: "down", hold: 120 },
      { h: "B", p: [-0.14, 0.24, 0.22], p2: [-0.10, 0.16, 0.22], shape: "bent", palm: "down", hold: 380, arc: 0.10 }
    ],
    "DAY": [
      { h: "R", p: [0.16, 0.20, 0.22], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.16, 0.20, 0.22], shape: "flat", palm: "down", hold: 380 }
    ],
    "TIME": [
      { h: "R", p: [-0.08, 0.18, 0.22], shape: "point", palm: "down", hold: 150 },
      { h: "R", p: [-0.08, 0.22, 0.22], shape: "point", palm: "down", hold: 380 }
    ],

    // ---- people ----
    "ME": [
      { h: "R", p: [0.08, 0.24, 0.18], shape: "point", palm: "in", hold: 380 }
    ],
    "YOU": [
      { h: "R", p: [0.16, 0.24, 0.30], shape: "point", palm: "fwd", hold: 380 }
    ],
    "WE": [
      { h: "R", p: [0.30, 0.26, 0.20], shape: "point", palm: "in", hold: 150, arc: 0.10 },
      { h: "R", p: [0.10, 0.24, 0.22], shape: "point", palm: "in", hold: 150, arc: 0.10 },
      { h: "R", p: [-0.10, 0.24, 0.20], shape: "point", palm: "in", hold: 380 }
    ],
    "NAME": [
      { h: "B", p: [0.08, 0.22, 0.22], shape: "two", palm: "down", hold: 150 },
      { h: "B", p: [0.08, 0.18, 0.22], shape: "two", palm: "down", hold: 120 },
      { h: "B", p: [0.08, 0.22, 0.22], shape: "two", palm: "down", hold: 380 }
    ],
    "FRIEND": [
      { h: "B", p: [0.10, 0.24, 0.24], shape: "hook", palm: "in", hold: 150 },
      { h: "B", p: [0.10, 0.24, 0.24], shape: "hook", palm: "fwd", hold: 380 }
    ],
    "FAMILY": [
      { h: "B", p: [0.16, 0.26, 0.24], shape: "ok", palm: "fwd", hold: 150, arc: 0.10 },
      { h: "B", p: [0.08, 0.22, 0.24], shape: "ok", palm: "fwd", hold: 380 }
    ],
    "MAN": [
      { h: "R", p: [0.08, 0.48, 0.12], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.08, 0.24, 0.16], shape: "flat", palm: "in", hold: 380 }
    ],
    "WOMAN": [
      { h: "R", p: [0.06, 0.42, 0.14], shape: "fist", palm: "in", hold: 150 },
      { h: "R", p: [0.06, 0.24, 0.16], shape: "fist", palm: "in", hold: 380 }
    ],
    "BOY": [
      { h: "R", p: [0.10, 0.48, 0.12], shape: "c-hand", palm: "in", hold: 150 },
      { h: "R", p: [0.10, 0.48, 0.12], shape: "fist", palm: "in", hold: 380 }
    ],
    "GIRL": [
      { h: "R", p: [0.12, 0.44, 0.12], shape: "fist", palm: "in", hold: 150 },
      { h: "R", p: [0.10, 0.38, 0.14], shape: "fist", palm: "in", hold: 380 }
    ],
    "DEAF": [
      { h: "R", p: [0.16, 0.42, 0.08], shape: "point", palm: "in", hold: 150 },
      { h: "R", p: [0.06, 0.44, 0.14], shape: "point", palm: "in", hold: 380 }
    ],

    // ---- call words ----
    "CALL": [
      { h: "R", p: [0.16, 0.40, 0.08], shape: "y-hand", palm: "in", hold: 380 }
    ],
    "PHONE": [
      { h: "R", p: [0.16, 0.40, 0.08], shape: "y-hand", palm: "in", hold: 150 },
      { h: "R", p: [0.18, 0.38, 0.14], shape: "y-hand", palm: "in", hold: 380 }
    ],
    "SEE": [
      { h: "R", p: [0.08, 0.46, 0.12], shape: "two", palm: "in", hold: 150 },
      { h: "R", p: [0.12, 0.44, 0.28], shape: "two", palm: "in", hold: 380 }
    ],
    "HEAR": [
      { h: "R", p: [0.16, 0.42, 0.08], shape: "point", palm: "in", hold: 150 },
      { h: "R", p: [0.20, 0.40, 0.20], shape: "point", palm: "in", hold: 380 }
    ],
    "LISTEN": [
      { h: "R", p: [0.16, 0.42, 0.10], shape: "cup", palm: "in", hold: 380 }
    ],
    "SPEAK": [
      { h: "R", p: [0.04, 0.44, 0.16], shape: "point", palm: "in", hold: 150 },
      { h: "R", p: [0.04, 0.42, 0.26], shape: "point", palm: "in", hold: 120 },
      { h: "R", p: [0.04, 0.44, 0.16], shape: "point", palm: "in", hold: 380 }
    ],
    "TELL": [
      { h: "R", p: [0.06, 0.44, 0.16], shape: "point", palm: "in", hold: 150 },
      { h: "R", p: [0.10, 0.40, 0.32], shape: "point", palm: "in", hold: 380 }
    ],
    "WRITE": [
      { h: "B", p: [0.14, 0.20, 0.24], p2: [-0.10, 0.18, 0.24], shape: "pinch", palm: "down", hold: 150 },
      { h: "B", p: [0.06, 0.18, 0.26], p2: [-0.10, 0.18, 0.24], shape: "pinch", palm: "down", hold: 380 }
    ],
    "TEXT": [
      { h: "B", p: [0.16, 0.20, 0.24], shape: "point", palm: "down", hold: 150 },
      { h: "B", p: [0.16, 0.16, 0.24], shape: "point", palm: "down", hold: 120 },
      { h: "B", p: [0.16, 0.20, 0.24], shape: "point", palm: "down", hold: 380 }
    ],
    "UNDERSTAND": [
      { h: "R", p: [0.12, 0.46, 0.12], shape: "point", palm: "in", hold: 150 },
      { h: "R", p: [0.12, 0.54, 0.14], shape: "point", palm: "in", hold: 380 }
    ],
    "AGAIN": [
      { h: "R", p: [0.12, 0.16, 0.22], shape: "bent", palm: "up", hold: 150, arc: 0.12 },
      { h: "R", p: [0.10, 0.30, 0.24], shape: "bent", palm: "up", hold: 380 }
    ],
    "SLOW": [
      { h: "B", p: [0.02, 0.12, 0.22], p2: [-0.16, 0.18, 0.20], shape: "flat", palm: "down", hold: 150 },
      { h: "B", p: [-0.08, 0.26, 0.20], p2: [-0.16, 0.18, 0.20], shape: "flat", palm: "down", hold: 380 }
    ],
    "SIGN": [
      { h: "B", p: [0.12, 0.26, 0.24], shape: "point", palm: "fwd", hold: 150 },
      { h: "B", p: [0.08, 0.24, 0.24], shape: "point", palm: "in", hold: 380 }
    ],
    "ANSWER": [
      { h: "B", p: [0.06, 0.44, 0.16], p2: [-0.16, 0.24, 0.24], shape: "point", palm: "fwd", hold: 150 },
      { h: "B", p: [0.06, 0.40, 0.30], p2: [-0.16, 0.24, 0.24], shape: "point", palm: "fwd", hold: 380 }
    ],

    // ---- numbers (palm-forward ASL number system; THREE/FOUR/SEVEN/EIGHT
    //      need a 3-/4-finger shape the engine does not define -> NEEDS_REVIEW) ----
    "ONE": [
      { h: "R", p: [0.28, 0.24, 0.24], shape: "point", palm: "fwd", hold: 380 }
    ],
    "TWO": [
      { h: "R", p: [0.28, 0.24, 0.24], shape: "two", palm: "fwd", hold: 380 }
    ],
    "FIVE": [
      { h: "R", p: [0.28, 0.24, 0.24], shape: "splay", palm: "fwd", hold: 380 }
    ],
    "SIX": [
      { h: "R", p: [0.28, 0.24, 0.24], shape: "y-hand", palm: "fwd", hold: 380 }
    ],
    "NINE": [
      { h: "R", p: [0.28, 0.24, 0.24], shape: "l-hand", palm: "fwd", hold: 380 }
    ],
    "TEN": [
      { h: "B", p: [0.28, 0.24, 0.24], shape: "fist", palm: "fwd", hold: 150 },
      { h: "B", p: [0.28, 0.20, 0.24], shape: "fist", palm: "fwd", hold: 380 }
    ],

    // ---- common verbs / adjectives ----
    "GO": [
      { h: "B", p: [0.18, 0.20, 0.20], shape: "point", palm: "in", hold: 150 },
      { h: "B", p: [0.18, 0.20, 0.34], shape: "point", palm: "in", hold: 380 }
    ],
    "COME": [
      { h: "B", p: [0.22, 0.22, 0.30], shape: "point", palm: "up", hold: 150 },
      { h: "B", p: [0.14, 0.22, 0.18], shape: "hook", palm: "up", hold: 380 }
    ],
    "WANT": [
      { h: "B", p: [0.26, 0.22, 0.28], shape: "bent", palm: "up", hold: 150 },
      { h: "B", p: [0.14, 0.22, 0.18], shape: "bent", palm: "up", hold: 380 }
    ],
    "NEED": [
      { h: "R", p: [0.20, 0.26, 0.24], shape: "hook", palm: "fwd", hold: 150 },
      { h: "R", p: [0.20, 0.18, 0.24], shape: "hook", palm: "fwd", hold: 380 }
    ],
    "GOOD": [
      { h: "R", p: [0.06, 0.44, 0.16], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.20, 0.28, 0.24], shape: "flat", palm: "down", hold: 380 }
    ],
    "BAD": [
      { h: "R", p: [0.06, 0.44, 0.16], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.22, 0.30, 0.26], shape: "flat", palm: "down", hold: 380 }
    ],
    "HAPPY": [
      { h: "R", p: [0.08, 0.16, 0.18], shape: "flat", palm: "in", hold: 120, face: "positive" },
      { h: "R", p: [0.08, 0.30, 0.18], shape: "flat", palm: "in", hold: 200 },
      { h: "R", p: [0.08, 0.16, 0.18], shape: "flat", palm: "in", hold: 380 }
    ],
    "FINE": [
      { h: "R", p: [0.08, 0.22, 0.16], shape: "l-hand", palm: "in", hold: 150, face: "positive" },
      { h: "R", p: [0.12, 0.22, 0.30], shape: "l-hand", palm: "in", hold: 380 }
    ],
    "LOVE": [
      { h: "B", p: [0.10, 0.22, 0.16], shape: "fist", palm: "in", hold: 380, face: "positive" }
    ],
    "SAD": [
      { h: "B", p: [0.12, 0.44, 0.14], shape: "flat", palm: "in", hold: 150 },
      { h: "B", p: [0.12, 0.28, 0.16], shape: "flat", palm: "in", hold: 380 }
    ],
    "ANGRY": [
      { h: "R", p: [0.10, 0.46, 0.14], shape: "bent", palm: "in", hold: 150, face: "emphasis" },
      { h: "R", p: [0.14, 0.32, 0.22], shape: "bent", palm: "in", hold: 380 }
    ],
    "TIRED": [
      { h: "B", p: [0.14, 0.30, 0.18], shape: "bent", palm: "in", hold: 150 },
      { h: "B", p: [0.14, 0.20, 0.18], shape: "bent", palm: "in", hold: 380 }
    ],
    "SAME": [
      { h: "B", p: [0.26, 0.24, 0.24], shape: "point", palm: "in", hold: 150 },
      { h: "B", p: [0.08, 0.24, 0.24], shape: "point", palm: "in", hold: 380 }
    ],
    "DIFFERENT": [
      { h: "B", p: [0.06, 0.24, 0.24], shape: "point", palm: "in", hold: 150 },
      { h: "B", p: [0.26, 0.24, 0.24], shape: "point", palm: "in", hold: 380 }
    ],
    "BIG": [
      { h: "B", p: [0.24, 0.26, 0.24], shape: "l-hand", palm: "fwd", hold: 150 },
      { h: "B", p: [0.34, 0.30, 0.24], shape: "l-hand", palm: "fwd", hold: 380 }
    ],
    "SMALL": [
      { h: "B", p: [0.20, 0.24, 0.24], shape: "pinch", palm: "fwd", hold: 150 },
      { h: "B", p: [0.12, 0.24, 0.24], shape: "pinch", palm: "fwd", hold: 380 }
    ],
    "MORE": [
      { h: "B", p: [0.10, 0.24, 0.24], shape: "pinch", palm: "in", hold: 150 },
      { h: "B", p: [0.10, 0.20, 0.24], shape: "pinch", palm: "in", hold: 380 }
    ],
    "WITH": [
      { h: "B", p: [0.10, 0.22, 0.22], shape: "fist", palm: "in", hold: 380 }
    ],
    "HAVE": [
      { h: "B", p: [0.20, 0.24, 0.22], shape: "bent", palm: "up", hold: 150 },
      { h: "B", p: [0.12, 0.24, 0.18], shape: "bent", palm: "up", hold: 380 }
    ],
    "KNOW": [
      { h: "R", p: [0.10, 0.48, 0.12], shape: "bent", palm: "in", hold: 380 }
    ],
    "DONT-KNOW": [
      { h: "R", p: [0.10, 0.48, 0.12], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.24, 0.44, 0.22], shape: "flat", palm: "in", hold: 380 }
    ],
    "THINK": [
      { h: "R", p: [0.12, 0.48, 0.12], shape: "point", palm: "in", hold: 150, arc: 0.08 },
      { h: "R", p: [0.14, 0.46, 0.14], shape: "point", palm: "in", hold: 380 }
    ],
    "FORGET": [
      { h: "R", p: [0.10, 0.48, 0.12], shape: "fist", palm: "in", hold: 150 },
      { h: "R", p: [0.22, 0.42, 0.20], shape: "splay", palm: "in", hold: 380 }
    ],
    "HURT": [
      { h: "B", p: [0.10, 0.24, 0.24], shape: "point", palm: "in", hold: 150 },
      { h: "B", p: [0.10, 0.24, 0.24], shape: "point", palm: "fwd", hold: 380 }
    ],
    "STOP": [
      { h: "B", p: [0.10, 0.30, 0.22], p2: [-0.12, 0.16, 0.22], shape: "flat", palm: "in", hold: 150 },
      { h: "B", p: [0.10, 0.18, 0.22], p2: [-0.12, 0.16, 0.22], shape: "flat", palm: "in", hold: 380 }
    ],
    "OPEN": [
      { h: "B", p: [0.08, 0.24, 0.24], shape: "fist", palm: "in", hold: 150 },
      { h: "B", p: [0.24, 0.24, 0.24], shape: "splay", palm: "fwd", hold: 380 }
    ],
    "CLOSE": [
      { h: "B", p: [0.24, 0.24, 0.24], shape: "splay", palm: "fwd", hold: 150 },
      { h: "B", p: [0.08, 0.24, 0.24], shape: "fist", palm: "in", hold: 380 }
    ],
    "GIVE": [
      { h: "B", p: [0.14, 0.20, 0.20], shape: "flat", palm: "up", hold: 150 },
      { h: "B", p: [0.14, 0.20, 0.32], shape: "flat", palm: "up", hold: 380 }
    ],

    // ---- daily life ----
    "EAT": [
      { h: "R", p: [0.04, 0.44, 0.15], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.10, 0.32, 0.20], shape: "flat", palm: "in", hold: 380 }
    ],
    "DRINK": [
      { h: "R", p: [0.10, 0.30, 0.20], shape: "c-hand", palm: "in", hold: 150 },
      { h: "R", p: [0.05, 0.44, 0.16], shape: "c-hand", palm: "in", hold: 380 }
    ],
    "MILK": [
      { h: "B", p: [0.18, 0.24, 0.22], shape: "cup", palm: "in", hold: 150 },
      { h: "B", p: [0.18, 0.24, 0.22], shape: "fist", palm: "in", hold: 380 }
    ],
    "COFFEE": [
      { h: "B", p: [0.10, 0.20, 0.22], shape: "fist", palm: "down", hold: 150, arc: 0.10 },
      { h: "B", p: [0.14, 0.20, 0.24], shape: "fist", palm: "down", hold: 380, arc: 0.10 }
    ],
    "HOME": [
      { h: "R", p: [0.06, 0.44, 0.14], shape: "flat", palm: "in", hold: 150 },
      { h: "R", p: [0.14, 0.44, 0.12], shape: "flat", palm: "in", hold: 380 }
    ],
    "DOOR": [
      { h: "B", p: [0.14, 0.26, 0.24], shape: "flat", palm: "in", hold: 150 },
      { h: "B", p: [0.24, 0.26, 0.28], shape: "flat", palm: "fwd", hold: 380 }
    ],
    "WORK": [
      { h: "B", p: [0.10, 0.20, 0.22], shape: "fist", palm: "down", hold: 150 },
      { h: "B", p: [0.10, 0.24, 0.22], shape: "fist", palm: "down", hold: 380 }
    ],
    "SCHOOL": [
      { h: "B", p: [0.10, 0.20, 0.22], shape: "flat", palm: "down", hold: 150 },
      { h: "B", p: [0.10, 0.24, 0.22], shape: "flat", palm: "fwd", hold: 120 },
      { h: "B", p: [0.10, 0.20, 0.22], shape: "flat", palm: "down", hold: 380 }
    ],
    "LEARN": [
      { h: "B", p: [0.10, 0.12, 0.22], p2: [-0.12, 0.12, 0.22], shape: "flat", palm: "up", hold: 150 },
      { h: "B", p: [0.10, 0.46, 0.14], p2: [-0.12, 0.12, 0.22], shape: "flat", palm: "up", hold: 380 }
    ],
    "TEACH": [
      { h: "B", p: [0.14, 0.46, 0.14], shape: "flat", palm: "fwd", hold: 150 },
      { h: "B", p: [0.14, 0.42, 0.24], shape: "flat", palm: "fwd", hold: 120 },
      { h: "B", p: [0.14, 0.42, 0.28], shape: "flat", palm: "fwd", hold: 380 }
    ],
    "BOOK": [
      { h: "B", p: [0.04, 0.20, 0.22], shape: "flat", palm: "in", hold: 150 },
      { h: "B", p: [0.22, 0.20, 0.22], shape: "flat", palm: "up", hold: 380 }
    ],
    "MONEY": [
      { h: "B", p: [0.10, 0.18, 0.22], p2: [-0.12, 0.16, 0.22], shape: "flat", palm: "down", hold: 150 },
      { h: "B", p: [0.10, 0.22, 0.22], p2: [-0.12, 0.16, 0.22], shape: "flat", palm: "down", hold: 380 }
    ],
    "CAR": [
      { h: "B", p: [0.14, 0.24, 0.26], shape: "fist", palm: "in", hold: 150 },
      { h: "B", p: [0.10, 0.24, 0.26], shape: "fist", palm: "in", hold: 380 }
    ],
    "PLANE": [
      { h: "R", p: [0.16, 0.28, 0.22], shape: "y-hand", palm: "down", hold: 150 },
      { h: "R", p: [0.24, 0.40, 0.30], shape: "y-hand", palm: "down", hold: 380, arc: 0.10 }
    ],
    "WALK": [
      { h: "B", p: [0.12, 0.16, 0.22], shape: "flat", palm: "down", hold: 150 },
      { h: "B", p: [0.12, 0.20, 0.26], shape: "flat", palm: "down", hold: 120 },
      { h: "B", p: [0.12, 0.16, 0.22], shape: "flat", palm: "down", hold: 380 }
    ],
    "SLEEP": [
      { h: "R", p: [0.10, 0.46, 0.14], shape: "splay", palm: "in", hold: 150 },
      { h: "R", p: [0.12, 0.38, 0.16], shape: "flat", palm: "in", hold: 380 }
    ],
    "DARK": [
      { h: "B", p: [0.08, 0.44, 0.14], shape: "flat", palm: "in", hold: 150 },
      { h: "B", p: [0.26, 0.40, 0.18], shape: "flat", palm: "in", hold: 380 }
    ],
    "RED": [
      { h: "R", p: [0.04, 0.44, 0.14], shape: "point", palm: "in", hold: 150 },
      { h: "R", p: [0.04, 0.38, 0.14], shape: "point", palm: "in", hold: 380 }
    ],
    "PLAY": [
      { h: "B", p: [0.18, 0.24, 0.24], shape: "y-hand", palm: "fwd", hold: 150 },
      { h: "B", p: [0.18, 0.20, 0.24], shape: "y-hand", palm: "fwd", hold: 380 }
    ],
    "MUSIC": [
      { h: "B", p: [-0.06, 0.20, 0.22], p2: [-0.18, 0.16, 0.20], shape: "flat", palm: "down", hold: 150 },
      { h: "B", p: [-0.14, 0.20, 0.22], p2: [-0.18, 0.16, 0.20], shape: "flat", palm: "down", hold: 380 }
    ],
    "DANCE": [
      { h: "B", p: [0.16, 0.20, 0.22], shape: "two", palm: "fwd", hold: 150 },
      { h: "B", p: [0.08, 0.20, 0.22], shape: "two", palm: "fwd", hold: 120 },
      { h: "B", p: [0.16, 0.20, 0.22], shape: "two", palm: "fwd", hold: 380 }
    ],
    "MEET": [
      { h: "B", p: [0.24, 0.24, 0.24], shape: "point", palm: "in", hold: 150 },
      { h: "B", p: [0.06, 0.24, 0.26], shape: "point", palm: "in", hold: 380 }
    ]
  },

  bsl: {
    // No BSL variants authored yet — the engine falls back to the ASL entries
    // above. BSL variants must be authored by a fluent BSL signer; see the
    // BSL:<GLOSS> entries in window.VOCLYNX_SIGNS3D_NEEDS_REVIEW.
  }
};

/* BSL FALLBACK LIST — every gloss below has NO BSL variant and currently
 * falls back to its ASL entry at runtime. BSL forms must be authored by a
 * fluent BSL signer before BSL accuracy is claimed:
 * HELLO, GOOD-MORNING, GOODBYE, PLEASE, THANK-YOU, SORRY, YES, NO,
 * WHO, WHAT, WHEN, WHERE, WHY, HOW, QUESTION,
 * NOW, TODAY, TOMORROW, MORNING, NIGHT, DAY, TIME,
 * ME, YOU, WE, NAME, FRIEND, FAMILY, MAN, WOMAN, BOY, GIRL, DEAF,
 * CALL, PHONE, SEE, HEAR, LISTEN, SPEAK, TELL, WRITE, TEXT,
 * UNDERSTAND, AGAIN, SLOW, SIGN, ANSWER,
 * ONE, TWO, FIVE, SIX, NINE, TEN,
 * GO, COME, WANT, NEED, GOOD, BAD, HAPPY, FINE, LOVE, SAD, ANGRY, TIRED,
 * SAME, DIFFERENT, BIG, SMALL, MORE, WITH, HAVE, KNOW, DONT-KNOW, THINK,
 * FORGET, HURT, STOP, OPEN, CLOSE, GIVE,
 * EAT, DRINK, MILK, COFFEE, HOME, DOOR, WORK, SCHOOL, LEARN, TEACH, BOOK,
 * MONEY, CAR, PLANE, WALK, SLEEP, DARK, RED, PLAY, MUSIC, DANCE, MEET
 */

window.VOCLYNX_SIGNS3D_NEEDS_REVIEW = [
  // ASL glosses NOT authored (uncertain form, or needs a handshape / per-hand
  // shape the engine does not define). Covered by fingerspelling until reviewed.
  "VIDEO",   // uncertain of the standard form
  "HELP",    // needs different shapes per hand (fist on flat palm)
  "READ",    // needs different shapes per hand (V-hand on flat palm)
  "THREE",   // no 3-finger handshape in the 14 engine names
  "FOUR",    // no 4-finger handshape in the 14 engine names
  "SEVEN",   // no thumb+ring handshape in the 14 engine names
  "EIGHT",   // no thumb+middle handshape in the 14 engine names
  "WEEK",    // uncertain without the non-dominant palm placed
  "YEAR",    // needs one fist circling a stationary fist (engine mirrors B)
  "WATER",   // no W handshape in the 14 engine names
  "COMPUTER",// uncertain of the standard form
  "CAMERA",  // uncertain of the standard form
  "INTERPRET",// uncertain of the standard form
  "EMAIL",   // fingerspell candidate
  "INTERNET",// uncertain of the standard form
  "BATHROOM",// no T handshape in the 14 engine names
  "DOCTOR",  // no M handshape in the 14 engine names
  "MEDICINE",// uncertain handshape mapping
  "SICK",    // uncertain handshape mapping
  "RUN",     // uncertain of the standard form
  "SIT",     // needs different shapes per hand
  "STAND",   // needs different shapes per hand
  "STORE",   // uncertain of the standard form
  "BUY",     // uncertain of the standard form
  "LIKE",    // uncertain of the standard handshape
  // BSL variants needed for every authored ASL gloss (fluent BSL review required)
  "BSL:HELLO", "BSL:GOOD-MORNING", "BSL:GOODBYE", "BSL:PLEASE", "BSL:THANK-YOU",
  "BSL:SORRY", "BSL:YES", "BSL:NO",
  "BSL:WHO", "BSL:WHAT", "BSL:WHEN", "BSL:WHERE", "BSL:WHY", "BSL:HOW", "BSL:QUESTION",
  "BSL:NOW", "BSL:TODAY", "BSL:TOMORROW", "BSL:MORNING", "BSL:NIGHT", "BSL:DAY", "BSL:TIME",
  "BSL:ME", "BSL:YOU", "BSL:WE", "BSL:NAME", "BSL:FRIEND", "BSL:FAMILY",
  "BSL:MAN", "BSL:WOMAN", "BSL:BOY", "BSL:GIRL", "BSL:DEAF",
  "BSL:CALL", "BSL:PHONE", "BSL:SEE", "BSL:HEAR", "BSL:LISTEN", "BSL:SPEAK",
  "BSL:TELL", "BSL:WRITE", "BSL:TEXT", "BSL:UNDERSTAND", "BSL:AGAIN", "BSL:SLOW",
  "BSL:SIGN", "BSL:ANSWER",
  "BSL:ONE", "BSL:TWO", "BSL:FIVE", "BSL:SIX", "BSL:NINE", "BSL:TEN",
  "BSL:GO", "BSL:COME", "BSL:WANT", "BSL:NEED", "BSL:GOOD", "BSL:BAD",
  "BSL:HAPPY", "BSL:FINE", "BSL:LOVE", "BSL:SAD", "BSL:ANGRY", "BSL:TIRED",
  "BSL:SAME", "BSL:DIFFERENT", "BSL:BIG", "BSL:SMALL", "BSL:MORE", "BSL:WITH",
  "BSL:HAVE", "BSL:KNOW", "BSL:DONT-KNOW", "BSL:THINK", "BSL:FORGET",
  "BSL:HURT", "BSL:STOP", "BSL:OPEN", "BSL:CLOSE", "BSL:GIVE",
  "BSL:EAT", "BSL:DRINK", "BSL:MILK", "BSL:COFFEE", "BSL:HOME", "BSL:DOOR",
  "BSL:WORK", "BSL:SCHOOL", "BSL:LEARN", "BSL:TEACH", "BSL:BOOK", "BSL:MONEY",
  "BSL:CAR", "BSL:PLANE", "BSL:WALK", "BSL:SLEEP", "BSL:DARK", "BSL:RED",
  "BSL:PLAY", "BSL:MUSIC", "BSL:DANCE", "BSL:MEET"
];
