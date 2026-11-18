/* voclynx sign-language pack registry — browser mirror.
 *
 * KEEP IN SYNC with the canonical server registry,
 * backend/lib/signLanguages.js. Same fields, minus the server-only ones
 * (glossLanguageName and vocabNote, which exist only to build the Bedrock
 * gloss prompt).
 *
 * Sign languages are pluggable packs: a new language is a registry entry
 * here plus sign/alphabet DATA files — not new engine code. dataStatus:
 *   'full'             authored signs + manual alphabet
 *   'partial'          some authored signs + manual alphabet
 *   'fingerspell-only' manual alphabet works, no authored signs yet
 *   'planned'          registered intent only — shown disabled in pickers
 *
 * manualAlphabet: 'asl-1h' (one-handed, ASL family), 'bsl-2h' (two-handed,
 * BANZSL family), or null when the language's alphabet differs from both
 * and is NOT implemented — null means no fingerspelling is claimed.
 *
 * Honesty: nothing here is certified sign language. Every pack needs
 * fluent Deaf review before release.
 */
(function () {
  'use strict';

  var LANGUAGES = [
    {
      code: 'asl',
      name: 'American Sign Language',
      nativeName: 'American Sign Language',
      regions: ['United States', 'Anglophone Canada'],
      fingerspellPrefix: 'FS',
      manualAlphabet: 'asl-1h',
      dataStatus: 'full',
      clientDataFiles: ['js/sign-data3d.js', 'js/fingerspell3d.js'],
      notes: 'Primary pack: authored sign vocabulary plus the complete one-handed manual alphabet.',
    },
    {
      code: 'bsl',
      name: 'British Sign Language',
      nativeName: 'British Sign Language',
      regions: ['United Kingdom'],
      fingerspellPrefix: 'BFS',
      manualAlphabet: 'bsl-2h',
      dataStatus: 'full',
      clientDataFiles: ['js/sign-data3d.js', 'js/sign-data3d-bsl.js', 'js/fingerspell3d.js'],
      notes: 'A distinct language from ASL. Authored BSL signs live in sign-data3d-bsl.js; '
        + 'untranslated glosses fingerspell in the two-handed BSL alphabet instead of borrowing '
        + 'ASL signs. The BSL manual-alphabet data is partial (vowels authored with confidence); '
        + 'letters without data surface as marked pauses, never as invented shapes.',
    },
    {
      code: 'psl',
      name: 'Pakistan Sign Language',
      nativeName: 'Pakistan Sign Language',
      regions: ['Pakistan'],
      fingerspellPrefix: 'PSL',
      // PSL's manual alphabet is its own single-handed alphabet; 'asl-1h'
      // records the one-handed style only — the letter data is PSL's own
      // (fingerspell3d-psl.js), not ASL's.
      manualAlphabet: 'asl-1h',
      dataStatus: 'partial',
      clientDataFiles: ['js/sign-data3d.js', 'js/sign-data3d-psl.js', 'js/fingerspell3d.js', 'js/fingerspell3d-psl.js'],
      notes: 'Partial pack: a small set of authored lexical signs (sign-data3d-psl.js) plus a '
        + 'verified single-handed manual alphabet (fingerspell3d-psl.js). Unknown words '
        + 'fingerspell with PSL: tokens.',
    },
    {
      code: 'auslan',
      name: 'Auslan',
      nativeName: 'Auslan (Australian Sign Language)',
      regions: ['Australia'],
      fingerspellPrefix: 'BFS',
      manualAlphabet: 'bsl-2h',
      dataStatus: 'fingerspell-only',
      clientDataFiles: [],
      notes: 'BANZSL family: Auslan uses the two-handed manual alphabet tradition it shares '
        + 'with BSL, so fingerspelling works today via BFS: tokens. No authored Auslan signs '
        + 'yet — Auslan is a distinct language from BSL, and its signs must be authored and '
        + 'reviewed by fluent Deaf Auslan signers before any vocabulary ships.',
    },
    {
      code: 'isl',
      name: 'Irish Sign Language',
      nativeName: 'Irish Sign Language (Teanga Chomharthaíochta na hÉireann)',
      regions: ['Ireland'],
      fingerspellPrefix: 'BFS',
      manualAlphabet: 'bsl-2h',
      dataStatus: 'fingerspell-only',
      clientDataFiles: [],
      notes: 'BANZSL-family two-handed manual alphabet, so fingerspelling works today via '
        + 'BFS: tokens. No authored ISL signs yet; ISL is a distinct language and needs its '
        + 'own authored, Deaf-reviewed pack.',
    },
    {
      code: 'sasl',
      name: 'South African Sign Language',
      nativeName: 'South African Sign Language',
      regions: ['South Africa'],
      fingerspellPrefix: 'BFS',
      manualAlphabet: 'bsl-2h',
      dataStatus: 'fingerspell-only',
      clientDataFiles: [],
      notes: 'BANZSL-family two-handed manual alphabet, so fingerspelling works today via '
        + 'BFS: tokens. No authored SASL signs yet; SASL is a distinct language and needs '
        + 'its own authored, Deaf-reviewed pack.',
    },
    {
      code: 'ngsl',
      name: 'Nigerian Sign Language',
      nativeName: 'Nigerian Sign Language',
      regions: ['Nigeria'],
      fingerspellPrefix: 'FS',
      manualAlphabet: 'asl-1h',
      dataStatus: 'fingerspell-only',
      clientDataFiles: [],
      notes: 'ASL-derived (ASL-based deaf education), so the one-handed FS: fingerspelling '
        + 'style applies today. NGSL has its own vocabulary and local signs — no authored '
        + 'NGSL signs yet; needs an authored, Deaf-reviewed pack.',
    },
    {
      code: 'lsf',
      name: 'French Sign Language',
      nativeName: 'Langue des signes française',
      regions: ['France'],
      fingerspellPrefix: 'LSF',
      manualAlphabet: null,
      dataStatus: 'planned',
      clientDataFiles: [],
      notes: 'Planned. LSF uses its own one-handed manual alphabet whose letterforms differ '
        + 'from ASL\u2019s — not implemented, so no fingerspelling is claimed. The LSF: prefix '
        + 'is a reserved name: the gloss validator and the client token parser do not '
        + 'accept it yet.',
    },
    {
      code: 'dgs',
      name: 'German Sign Language',
      nativeName: 'Deutsche Gebärdensprache',
      regions: ['Germany', 'Austria'],
      fingerspellPrefix: 'DGS',
      manualAlphabet: null,
      dataStatus: 'planned',
      clientDataFiles: [],
      notes: 'Planned. DGS uses its own one-handed manual alphabet whose letterforms differ '
        + 'from ASL\u2019s — not implemented, so no fingerspelling is claimed. The DGS: prefix '
        + 'is a reserved name: the gloss validator and the client token parser do not '
        + 'accept it yet.',
    },
    {
      code: 'libras',
      name: 'Brazilian Sign Language',
      nativeName: 'Língua Brasileira de Sinais (Libras)',
      regions: ['Brazil'],
      fingerspellPrefix: 'LIBRAS',
      manualAlphabet: null,
      dataStatus: 'planned',
      clientDataFiles: [],
      notes: 'Planned. Libras uses its own one-handed manual alphabet whose letterforms '
        + 'differ from ASL\u2019s — not implemented, so no fingerspelling is claimed. The '
        + 'LIBRAS: prefix is a reserved name: the gloss validator and the client token '
        + 'parser do not accept it yet.',
    },
    {
      code: 'jsl',
      name: 'Japanese Sign Language',
      nativeName: 'Japanese Sign Language (Nihon Shuwa)',
      regions: ['Japan'],
      fingerspellPrefix: 'JSL',
      manualAlphabet: null,
      dataStatus: 'planned',
      clientDataFiles: [],
      notes: 'Planned. JSL fingerspelling (yubimoji) is kana-based and entirely different '
        + 'from Latin-letter manual alphabets — not implemented, so no fingerspelling is '
        + 'claimed. The JSL: prefix is a reserved name: the gloss validator and the '
        + 'client token parser do not accept it yet.',
    },
  ];

  window.VOCLYNX_SIGN_LANGUAGES = LANGUAGES;

  window.voclynxSignLanguages = {
    /** All registered packs, in display order. */
    list: function () { return LANGUAGES.slice(); },
    /** One pack by its exact lowercase code, or null for unknown codes. */
    get: function (code) {
      if (typeof code !== 'string') return null;
      for (var i = 0; i < LANGUAGES.length; i++) {
        if (LANGUAGES[i].code === code) return LANGUAGES[i];
      }
      return null;
    },
    /** Packs a user may pick today: everything except 'planned'. */
    selectable: function () {
      return LANGUAGES.filter(function (l) { return l.dataStatus !== 'planned'; });
    },
  };
})();
