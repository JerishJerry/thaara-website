/* ============================================================
   THAARA — image variant generator
   ============================================================

   BUILD-TIME ONLY. This is not part of the website and must never become a
   project dependency: the site itself is zero-dependency static HTML, CSS and
   vanilla JS with no build step. Run this by hand when a source image changes,
   commit the generated files, and that's it.

   Usage — install sharp somewhere outside this repo so it never becomes a
   project dependency, then run with NODE_PATH pointing at that install.
   NODE_PATH is required: node resolves require() from the SCRIPT's directory,
   not the working directory, so simply cd-ing into the install dir won't work.

     mkdir -p /tmp/imgtool && cd /tmp/imgtool
     npm init -y && npm install sharp
     NODE_PATH=/tmp/imgtool/node_modules node "/d/Jerin Website/tools/build-images.js"

   On PowerShell:
     $env:NODE_PATH="C:\tmp\imgtool\node_modules"
     node "D:\Jerin Website\tools\build-images.js"

   Inputs (the lossless masters — never modify or delete them):
     logo.png                      798x614   RGBA, transparency genuinely used
     invitation-save-the-date.png  1624x969  RGBA, fully opaque (alpha is dead weight)
     leo-asnia-source.webp         2160x3840 opaque — NOT a lossless master like the two
                                    above; it's the client project's own cover image,
                                    re-exported from the live site (no original design file
                                    on hand). Kept anyway as this image's single source of
                                    truth — do not re-fetch/replace casually.
     studio-poster-source.jpg      1145x1374 opaque — the studio's own promotional poster
                                    (studio collateral, not client work). A social-sized
                                    export, so 880w is the largest useful variant.

   Outputs, all written to the repo root:
     invitation-{480,800,1200,1624}.{avif,webp}   portfolio image, opaque, landscape
     leo-asnia-{480,800,1200}.{avif,webp}         portfolio image, opaque, portrait 9:16
     studio-poster-{480,880}.{avif,webp}          studio poster, opaque, portrait 5:6
     logo-{128,256}.webp + logo-256.png           logo, alpha preserved
     favicon-32.png, favicon-180.png              icons on the brand ground
     og-image.jpg                                 1200x630 social card

   Quality was verified, not assumed: decoded output compared against the
   original at matching size gave PSNR 39.1 dB (WebP) and 39.9 dB (AVIF),
   mean absolute error under 2/255. If you change the quality numbers below,
   re-measure rather than eyeballing.
   ============================================================ */

const fs = require('fs');
const path = require('path');

/* sharp is intentionally NOT a dependency of this repo, so require() will not
   find it unless NODE_PATH points at an install elsewhere. Fail with the fix
   rather than a bare MODULE_NOT_FOUND stack. */
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error(
    'sharp not found.\n\n' +
    'It is deliberately not a dependency of this repo — the site ships with none.\n' +
    'Install it outside the project and point NODE_PATH at it:\n\n' +
    '  mkdir -p /tmp/imgtool && cd /tmp/imgtool\n' +
    '  npm init -y && npm install sharp\n' +
    '  NODE_PATH=/tmp/imgtool/node_modules node "' + __filename + '"\n\n' +
    'NODE_PATH is required: node resolves require() from the script directory,\n' +
    'not the working directory.'
  );
  process.exit(1);
}

// Repo root, resolved from this file's location so it works from any cwd.
const ROOT = path.resolve(__dirname, '..') + path.sep;

const INVITATION = ROOT + 'invitation-save-the-date.png';
const LOGO = ROOT + 'logo.png';

const BG = { r: 25, g: 22, b: 17 };          // --bg  #191611
const WIDTHS = [480, 800, 1200, 1624];

/* Every non-logo image on the page: the Work projects, plus studio collateral
   that is explicitly NOT a project (see the entries). `slug` is the served base
   name: slug-{width}.{avif,webp}. Widths are per-image because the layouts
   differ — the flagship runs near-container-width, so it earns 1624w; the
   split-layout cards never render past ~560px CSS pixels, so 1200w already
   covers a 2x screen and anything larger would be bytes nobody downloads. */
const PORTFOLIO = [
  { master: INVITATION, slug: 'invitation', widths: WIDTHS },
  { master: ROOT + 'leo-asnia-source.webp', slug: 'leo-asnia', widths: [480, 800, 1200] },
  /* Studio collateral, NOT a client project — THAARA's own promotional poster,
     shown in About. The invitation pictured in it is a sample design. It rides
     this array only because the encoding settings are the same. */
  { master: ROOT + 'studio-poster-source.jpg', slug: 'studio-poster', widths: [480, 880] },
];

const kb = (f) => (fs.statSync(ROOT + f).size / 1024).toFixed(1).padStart(7) + ' KB';

(async () => {
  for (const f of [LOGO, ...PORTFOLIO.map((p) => p.master)]) {
    if (!fs.existsSync(f)) {
      console.error('Missing source image: ' + f);
      process.exit(1);
    }
  }

  const out = [];

  /* ---- Portfolio images ----
     The sources are fully opaque, so flatten() drops the useless alpha channel
     rather than paying to encode it. Quality stays high: this is the work the
     studio is judged on. */
  for (const { master, slug, widths } of PORTFOLIO) {
    for (const w of widths) {
      const base = sharp(master)
        .resize({ width: w, withoutEnlargement: true })
        .flatten({ background: BG });

      await base.clone().webp({ quality: 86, effort: 6 }).toFile(ROOT + `${slug}-${w}.webp`);
      await base.clone().avif({ quality: 62, effort: 6 }).toFile(ROOT + `${slug}-${w}.avif`);

      out.push(`${slug.padEnd(10)} ${String(w).padStart(4)}w   webp ${kb(`${slug}-${w}.webp`)}   avif ${kb(`${slug}-${w}.avif`)}`);
    }
  }

  /* ---- Logo ----
     Transparency here is real (alpha mean ~12.8), so it must survive. */
  for (const w of [128, 256]) {
    await sharp(LOGO)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 92, effort: 6, alphaQuality: 100 })
      .toFile(ROOT + `logo-${w}.webp`);
    out.push(`logo       ${String(w).padStart(4)}w   webp ${kb(`logo-${w}.webp`)}`);
  }

  // PNG fallback for the <img> inside <picture>.
  await sharp(LOGO).resize({ width: 256 })
    .png({ compressionLevel: 9, palette: true })
    .toFile(ROOT + 'logo-256.png');
  out.push(`logo        256w   png  ${kb('logo-256.png')}`);

  /* ---- Favicons ----
     Composited onto the brand ground so the mark still reads at 32px, where a
     transparent background would leave it floating on whatever the browser
     chrome happens to be. */
  for (const s of [32, 180]) {
    await sharp(LOGO)
      .resize({ width: s, height: s, fit: 'contain', background: { ...BG, alpha: 1 } })
      .flatten({ background: BG })
      .png({ compressionLevel: 9 })
      .toFile(ROOT + `favicon-${s}.png`);
    out.push(`favicon  ${String(s).padStart(4)}px   png  ${kb(`favicon-${s}.png`)}`);
  }

  /* ---- Social card ----
     `contain`, not `cover`. The source is 1.68:1 and the card is 1.91:1, so
     cropping would cut into the composition — letterbox onto the brand ground
     instead. */
  await sharp(INVITATION)
    .resize({ width: 1200, height: 630, fit: 'contain', background: BG })
    .flatten({ background: BG })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(ROOT + 'og-image.jpg');
  out.push(`og-image 1200x630   jpg  ${kb('og-image.jpg')}`);

  console.log(out.join('\n'));
  console.log('\nMasters left untouched:');
  console.log('  invitation-save-the-date.png ' + kb('invitation-save-the-date.png'));
  console.log('  leo-asnia-source.webp        ' + kb('leo-asnia-source.webp'));
  console.log('  studio-poster-source.jpg     ' + kb('studio-poster-source.jpg'));
  console.log('  logo.png                     ' + kb('logo.png'));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
