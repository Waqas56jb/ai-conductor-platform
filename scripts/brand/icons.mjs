// Builds the installable-app (PWA) icons from the full-colour logo master.
//
//   node scripts/brand/icons.mjs
//
// The "P" mark is the left part of public/brand/logo-color.png; it sits on a
// light tile (its blues need a light background), and a white silhouette is
// the Android status-bar badge.
import sharp from "sharp";

const MASTER = "public/brand/logo-color.png";
const OUT = "public/icons";
const TILE = "#f5f7ff";

const meta = await sharp(MASTER).metadata();
// The mark ends where the wordmark's gap begins (~21 % of the master width).
const markWidth = Math.round(meta.width * 0.21);
const mark = await sharp(MASTER)
  .extract({ left: 0, top: 0, width: markWidth, height: meta.height })
  .trim()
  .toBuffer();

async function tile(size, scale, file) {
  const inner = Math.round(size * scale);
  const glyph = await sharp(mark)
    .resize(inner, inner, { fit: "contain", background: "#0000" })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: TILE } })
    .composite([{ input: glyph, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${file}`);
}

await tile(192, 0.62, "icon-192.png");
await tile(512, 0.62, "icon-512.png");
// Maskable: the safe zone is the inner 80 % circle.
await tile(512, 0.5, "maskable-512.png");

// Badge: white silhouette on transparent.
const silhouette = await sharp(mark)
  .resize(72, 72, { fit: "contain", background: "#0000" })
  .ensureAlpha()
  .extractChannel("alpha")
  .toBuffer();
await sharp({ create: { width: 72, height: 72, channels: 3, background: "#ffffff" } })
  .joinChannel(silhouette)
  .extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#0000" })
  .png()
  .toFile(`${OUT}/badge-96.png`);

console.log("PWA icons written");
