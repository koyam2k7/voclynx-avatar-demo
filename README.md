# voclynx — signing avatar demo

A standalone, testable simulation of the voclynx signing avatar inside a
mock caption call. **This demo repo is separate from the voclynx product
repos — nothing here touches the voclynx setup.**

**Live demo:** https://koyam2k7.github.io/voclynx-avatar-demo/

## What it shows

- The production Three.js signer engine driving anime-style 3D avatars
  (cel-shaded, at the owner's direction): **Nia — Black woman**,
  **Anna — White woman**, **Marc — Black man**, **Elias — White man**.
  Both hands sign; in the two-handed alphabets (BSL/PSL) the support
  hand stays up and working for every letter.
- Hearing side: type, pick a preset line, or use the mic — the line
  appears as a caption and the avatar signs it on the deaf side.
- Sign languages: ASL / BSL / PSL authored packs; Auslan, ISL, SASL and
  Nigerian Sign Language fingerspell for now; LSF, DGS, Libras and JSL
  are registered as "in development".
- Deaf side: type a reply and it is read aloud (text-to-speech).

## Notes

- Runs entirely in the browser (GitHub Pages static hosting), in the
  built-in local-gloss mode — no backend needed.
- Sign poses are communication support, not a certified interpreter;
  every language pack needs fluent Deaf review before release.
- In a real voclynx call, the hearing side never sees captions or the
  signer. This demo shows both sides so it can be tested.
