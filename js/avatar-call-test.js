/* voclynx avatar call test — mock live call wiring for avatar-call-test.html.
 *
 * Hearing side: typed/spoken lines become captions on the deaf side and are
 * signed by the 3D avatar. Deaf side: typed replies are spoken aloud (TTS)
 * to the hearing side. Glossing mirrors the real console: local word-level
 * signing happens immediately so the avatar never stalls, and when this
 * page is served by the voclynx backend the /api/sign/gloss service
 * (Bedrock) can preempt with proper sign-grammar glosses. Any failure of
 * that call — including the 401/404 this static page gets when served
 * standalone — silently keeps the local signing.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var engine = null;
  var currentLang = 'asl';
  var lineSeq = 0; // guards against a slow gloss reply preempting a newer line

  /* ---------------- local gloss fallback ---------------- */
  // Simple tokenizer: uppercase, strip punctuation, drop stopwords, emit
  // each remaining word as a gloss token. The engine signs the words it
  // knows and fingerspells the rest — no word is silently dropped.
  var STOPWORDS = {
    THE: 1, A: 1, AN: 1, IS: 1, ARE: 1, WAS: 1, WERE: 1, AM: 1, BE: 1,
    BEEN: 1, TO: 1, OF: 1, AND: 1, OR: 1, BUT: 1, IN: 1, ON: 1, AT: 1,
    FOR: 1, WITH: 1, IT: 1, ITS: 1, THIS: 1, THAT: 1, UM: 1, UH: 1,
  };
  function localGloss(text) {
    var words = String(text || '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w && !STOPWORDS[w]; });
    // Merge adjacent words into hyphenated glosses the sign library
    // actually has (THANK YOU -> THANK-YOU, GOOD MORNING -> GOOD-MORNING)
    // — otherwise courtesy phrases get fingerspelled letter by letter.
    var known = {};
    try {
      var data = window.VOCLYNX_SIGNS3D || {};
      Object.keys(data).forEach(function (lang) {
        Object.keys(data[lang] || {}).forEach(function (k) { known[k] = 1; });
      });
    } catch (e) { /* merging is a bonus; plain words still sign */ }
    var out = [];
    for (var i = 0; i < words.length; i++) {
      if (i + 1 < words.length && known[words[i] + '-' + words[i + 1]]) {
        out.push(words[i] + '-' + words[i + 1]);
        i++;
      } else {
        out.push(words[i]);
      }
    }
    return out.slice(0, 12);
  }

  /* ---------------- backend gloss (progressive enhancement) ---------------- */
  function glossViaBackend(text, lang) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 6000) : null;
    function done(v) { if (timer) clearTimeout(timer); return v; }
    return fetch('/api/sign/gloss', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 500), language: lang }),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json().catch(function () { return null; });
    }).then(function (data) {
      return done((data && data.ok && Array.isArray(data.glosses) && data.glosses.length)
        ? data.glosses : null);
    }).catch(function () { return done(null); });
  }

  /* ---------------- UI helpers ---------------- */
  function addLog(ul, who, text) {
    if (!ul) return;
    var li = document.createElement('li');
    var w = document.createElement('span');
    w.className = 'who';
    w.textContent = who + ' ';
    li.appendChild(w);
    li.appendChild(document.createTextNode(text));
    ul.appendChild(li);
    while (ul.children.length > 8) ul.removeChild(ul.firstChild);
  }

  function setGlossStatus(msg) { $('gloss-status').textContent = msg; }

  // Honest coverage readout from the engine: which words were fingerspelled
  // (no authored sign yet) and which letters had no manual-alphabet preset
  // (shown as pauses). Never let missing coverage pass silently.
  function reportCoverageSoon() {
    setTimeout(function () {
      if (!engine || typeof engine.getLastReport !== 'function') return;
      var rep = engine.getLastReport();
      var el = $('signer-status');
      if (!rep) { el.textContent = 'Signer ready'; return; }
      var bits = [];
      if (rep.missingWords && rep.missingWords.length) {
        bits.push('fingerspelled (no sign yet): ' + rep.missingWords.join(', '));
      }
      if (rep.missingLetters && rep.missingLetters.length) {
        bits.push('letters shown as pauses (alphabet not implemented): ' + rep.missingLetters.join(' '));
      }
      el.textContent = bits.length ? bits.join(' · ') : 'Signer ready';
    }, 350);
  }

  /* ---------------- call flow ---------------- */
  function signLine(text) {
    if (!engine) return;
    var seq = ++lineSeq;
    var local = localGloss(text);
    if (local.length) engine.play(local);
    setGlossStatus('Signed with the local fallback: ' + (local.join(' ') || '(nothing to sign)'));
    reportCoverageSoon();
    glossViaBackend(text, currentLang).then(function (glosses) {
      if (!glosses || seq !== lineSeq || !engine) return; // a newer line owns the avatar
      engine.play(glosses);
      setGlossStatus('Signed with the gloss service: ' + glosses.join(' '));
      reportCoverageSoon();
    });
  }

  function sendLine(text) {
    var t = String(text || '').trim();
    if (!t) return;
    addLog($('hearing-log'), 'You said:', t);
    $('caption-live').textContent = t;
    addLog($('caption-log'), 'Caption:', t);
    signLine(t);
  }

  function sendReply() {
    var input = $('reply-input');
    var t = input.value.trim();
    if (!t) return;
    input.value = '';
    addLog($('caption-log'), 'You replied:', t);
    addLog($('hearing-log'), 'Deaf side (spoken aloud):', t);
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(t));
      }
    } catch (e) { /* TTS is a nicety; the log line above still shows the reply */ }
  }

  /* ---------------- language + avatar pickers ---------------- */
  function statusSuffix(l) {
    if (l.dataStatus === 'fingerspell-only') return ' (fingerspelling only)';
    if (l.dataStatus === 'partial') return ' (partial vocabulary)';
    return '';
  }

  function showPackNote() {
    var reg = window.voclynxSignLanguages;
    var l = reg ? reg.get(currentLang) : null;
    $('pack-note').textContent = l ? l.notes : '';
  }

  function buildLanguageSelect() {
    var sel = $('lang-select');
    var reg = window.voclynxSignLanguages;
    if (!reg) {
      var o = document.createElement('option');
      o.value = 'asl';
      o.textContent = 'American Sign Language';
      sel.appendChild(o);
      return;
    }
    reg.list().forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.name + statusSuffix(l);
      if (l.dataStatus === 'planned') {
        opt.disabled = true;
        opt.textContent += ' — in development';
      }
      sel.appendChild(opt);
    });
    sel.value = 'asl';
  }

  /* ---------------- signer engine ---------------- */
  function initSigner() {
    var canvas = $('signer-canvas');
    if (typeof createSigner3DEngine !== 'function') {
      $('signer-status').textContent = 'Signer engine failed to load.';
      return;
    }
    try {
      engine = createSigner3DEngine(canvas, 'nia', { vrm: { url: 'models/anime/nia.vrm' } });
    } catch (e) { engine = null; }
    if (!engine || !engine.ready) {
      engine = null;
      $('signer-status').textContent = '3D signer unavailable here (WebGL required) — captions still work.';
      return;
    }
    engine.setLanguage(currentLang);
    $('signer-status').textContent = 'Signer ready';
  }

  /* ---------------- speech recognition (optional) ---------------- */
  function initMic() {
    var btn = $('hear-mic');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      btn.disabled = true;
      btn.textContent = 'Microphone not supported in this browser';
      return;
    }
    var rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      var t = ev.results[0][0].transcript;
      $('hear-input').value = t;
      sendLine(t);
    };
    rec.onend = function () { btn.textContent = 'Use microphone'; };
    rec.onerror = function () { btn.textContent = 'Use microphone'; };
    btn.addEventListener('click', function () {
      try { rec.start(); btn.textContent = 'Listening…'; } catch (e) { /* already running */ }
    });
  }

  /* ---------------- wire up ---------------- */
  buildLanguageSelect();
  showPackNote();
  initSigner();
  initMic();

  $('hear-send').addEventListener('click', function () {
    sendLine($('hear-input').value);
    $('hear-input').value = '';
  });
  $('hear-input').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      sendLine($('hear-input').value);
      $('hear-input').value = '';
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.preset'), function (b) {
    b.addEventListener('click', function () { sendLine(b.getAttribute('data-line')); });
  });
  $('lang-select').addEventListener('change', function () {
    currentLang = $('lang-select').value;
    if (engine) engine.setLanguage(currentLang);
    showPackNote();
  });
  $('avatar-select').addEventListener('change', function () {
    if (engine) engine.setAvatar($('avatar-select').value);
  });
  $('reply-send').addEventListener('click', sendReply);
  $('reply-input').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') sendReply();
  });
})();
