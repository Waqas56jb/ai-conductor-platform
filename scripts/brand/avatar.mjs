// Builds the assistant avatar assets from the cut-out masters.
//
//   node scripts/brand/avatar.mjs
//
// public/brand/avatar-cutout.png is avatar.jpg with its background removed
// (one-off, with rembg's isnet-general-use model, edges defringed). The man is
// the same illustration redrawn (gpt-image-2 edit of avatar.jpg, framed to the
// same 1075x992 canvas) and cut out the same way. Everything else is derived here.
import sharp from "sharp";

const WOMAN = "public/brand/avatar-cutout.png";
const MAN = "public/brand/avatar-man-cutout.png";
// Head and headset, with the top of the collar, in master coordinates.
const WOMAN_HEAD = { left: 75, top: 20, width: 760, height: 760 };
const MAN_HEAD = { left: 80, top: 30, width: 720, height: 720 };

const disc = (size, feather) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs><filter id="f"><feGaussianBlur stdDeviation="${feather}"/></filter></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - feather * 2}" fill="#fff" filter="url(#f)"/>
    </svg>`,
  );

// Soft brand-blue backdrop, lighter where the face is.
const backdrop = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs><radialGradient id="g" cx="50%" cy="38%" r="70%">
        <stop offset="0" stop-color="#dbe8ff"/><stop offset="0.55" stop-color="#8fb4ff"/>
        <stop offset="1" stop-color="#2f6bff"/>
      </radialGradient></defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
    </svg>`,
  );

async function head(size, master = WOMAN, crop = WOMAN_HEAD) {
  const face = await sharp(master).extract(crop).resize(size, size).toBuffer();
  return sharp(backdrop(size))
    .composite([{ input: face }, { input: disc(size, Math.max(1, size / 256)), blend: "dest-in" }])
    .png({ compressionLevel: 9, palette: true, quality: 92, dither: 0.6 });
}

await (await head(512)).toFile("public/brand/avatar-head.png");
await (await head(64)).toFile("public/brand/avatar-head-64.png");

// Landing page: hero portraits and the round heads shown on phones.
await sharp(WOMAN)
  .webp({ quality: 86, alphaQuality: 90 })
  .toFile("legacy/client/public/avatar-portrait.webp");
await (await head(320)).webp({ quality: 88 }).toFile("legacy/client/public/avatar-head.webp");
await sharp(MAN)
  .webp({ quality: 86, alphaQuality: 90 })
  .toFile("legacy/client/public/avatar-man-portrait.webp");
await (await head(320, MAN, MAN_HEAD)).webp({ quality: 88 }).toFile("legacy/client/public/avatar-man-head.webp");

console.log("avatar assets written");
