# Forma V03 — Jazi

A browser-based studio for 3D lettering and raster surface painting.

## Run locally

Requires Node.js 22 and npm.

    npm ci
    npm run build

Open dist/index.html in a modern browser. The prebuilt dist folder is included,
so a build is only needed after changing JavaScript source.

The app has no backend, accounts or runtime CDN dependencies.
Models, fonts and artwork are processed in the browser. Save editable work
using **Save project** before closing.

## Share with the team

Share Forma-V03-Team.zip or its standalone V03.html file.
Recipients should extract the ZIP and open the HTML in a browser with WebGL
enabled. For iPad, use a hosted HTTPS link in Safari; Files/Quick Look may
preview an HTML file without running the app.

## Publish on GitHub Pages

1. Create an empty GitHub repository.
2. Extract this source ZIP and upload its **contents**, including .github.
   The ZIP itself must not be the only file in the repository.
3. In the repository, open **Settings → Pages → Source → GitHub Actions**.
4. Open **Actions → Deploy Forma to GitHub Pages → Run workflow**.
   Later pushes to main also deploy automatically.
5. Share the Pages URL shown by the completed deployment.

The workflow publishes only the built dist folder. GitHub Pages does not
provide the owner-only access controls of the original hosted tool.

## Features

- Eight editable shapes, including milk jar and milk pack.
- Monoline lettering, built-in outline fonts and local TTF/OTF/WOFF imports.
- Raster acrylic, pastel and pen brushes, plus a soft eraser.
- Touch controls and tablet portrait/landscape layouts.
- PNG, JPEG, PSD, GLB and browser-supported turntable video exports.
- SVG for projects without painting.
- Editable project files with embedded imported fonts.

## Source layout

- src/app.js: editor, scene, imports and exports.
- src/font-paths.js: font parsing and outline paths.
- src/raster-paint.js: raster brush textures.
- dist/index.html and dist/style.css: interface.
- dist/app.js: generated browser bundle.

Run npm run build after editing JavaScript. HTML and CSS are authored directly
inside dist; keep those files when rebuilding.

## Limits and validation

Read USER-GUIDE.txt for font, export and browser limitations.
Chrome rendering, font import, project save/reopen and tablet-sized layouts
were checked. Physical iPad/Pencil behavior and movie recording have not been
fully verified. The GitHub workflow has not yet run in a GitHub repository.

## Rights and third-party components

Third-party libraries and bundled fonts retain their own licenses; see
THIRD-PARTY-NOTICES.txt. No new open-source license is granted here for the
custom application or Jazi branding. Add your chosen project license before
offering broader reuse.
