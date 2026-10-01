# vendor/

Third-party code, checked in so the site keeps its no-build, no-`package.json` setup. Pages load
it through an import map (`three`, `three/addons/`) and a plain `<script>` tag (GSAP).

| Path | Library | Version | Licence |
|---|---|---|---|
| `three/three.module.min.js` | three.js, the full build (every export) | 0.186.1 (r186) | MIT, see `three/LICENSE` |
| `three/addons/` | three.js examples (`examples/jsm/`), unmodified | 0.186.1 | MIT |
| `gsap/gsap.min.js` | GSAP core (UMD, sets `window.gsap`) | 3.15.0 | GreenSock standard "no charge" licence, <https://gsap.com/standard-license> (header kept in the file) |

## three.js addons in use

- `environments/RoomEnvironment.js` (the only one the site imports, from `js/envelope/envelope.js`)

Addons keep their `examples/jsm/` subfolders, so their relative imports resolve as shipped and their
bare `'three'` import resolves through the import map.

The post-processing and shader addons (bloom, FXAA, output pass) were only used by the retired 3D
prototype and were removed with it on 2026-10-01. They are still in git history if bloom is ever
wanted again.

## Updating

- The npm tarball ships the three.js build split in two (`build/three.module.js` imports
  `build/three.core.js`). `three.module.min.js` is those two combined into one minified module, so
  the import map points at a single file. Rebuild it the same way from the new version.
- Copy any added addon from the same version's `examples/jsm/`, keeping its subfolder, and check
  its relative imports.
- Keep every three.js file on one version. Addons from a different release can break silently.
