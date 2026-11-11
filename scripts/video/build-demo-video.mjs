// Step 2: the ~1 min narrated demo video (French, OpenAI TTS, ffmpeg) from the
// screens of step 1, with on-screen subtitles and an honest "Bientôt" chip on
// planned features. Update `scenes` when a planned feature ships. From the repo root:
//   node --env-file=.env scripts/video/build-demo-video.mjs <workDir> legacy/client/public
// Writes demo-immobilier.mp4 (1080p), demo-immobilier-720.mp4 and the poster.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [work, publicDir] = process.argv.slice(2);
const shots = path.join(work, "video");
const tmp = path.join(work, "video-build");
fs.mkdirSync(tmp, { recursive: true });

const AVAILABLE = "Disponible";
const SOON = "Bientôt";
const scenes = [
  {
    id: "00-intro",
    kind: "intro",
    title: "Copropriété et gestion locative",
    narration:
      "Pratonna en une minute : la copropriété, puis la gestion locative.",
  },
  { id: "01-chapter", kind: "chapter", chapter: "1", title: "Gestion de copropriété", pause: 1.2 },
  {
    id: "02-leak",
    image: "02-leak.png",
    chapter: "Copropriété",
    title: "Une fuite ? Le bon intervenant, en un clic",
    chip: AVAILABLE,
    narration:
      "Une fuite est signalée ? L’urgence est repérée, et vous missionnez l’intervenant sous contrat en un clic.",
  },
  {
    id: "03-service-order",
    image: "03-service-order.png",
    chapter: "Copropriété",
    title: "L’ordre de service, avec la comptabilité intégrée",
    chip: AVAILABLE,
    narration:
      "L’ordre de service est préparé : fonds vérifiés par la comptabilité intégrée, revue comptable, puis signature en ligne.",
  },
  {
    id: "04-meeting",
    image: "04-meeting.png",
    chapter: "Copropriété",
    title: "Le compte rendu d’AG, rédigé pour vous",
    chip: AVAILABLE,
    narration:
      "Après l’AG, le compte rendu est rédigé à partir de vos notes : décisions, votes et actions.",
  },
  {
    id: "05-soon-copro",
    kind: "soon",
    chapter: "Copropriété",
    title: "Bientôt dans Pratonna",
    items: ["PV d’assemblée générale au format officiel", "État daté", "Pré-état daté"],
    narration: "Bientôt : le PV d’AG officiel, l’état daté et le pré-état daté.",
  },
  { id: "06-chapter", kind: "chapter", chapter: "2", title: "Gestion locative", pause: 1.2 },
  {
    id: "07-invoices",
    image: "05-invoices.png",
    chapter: "Gestion locative",
    title: "Les impayés relancés, après votre accord",
    chip: AVAILABLE,
    narration:
      "Une facture impayée ? La relance est prête, elle part dès votre accord.",
  },
  {
    id: "08-payments",
    image: "07-payments.png",
    chapter: "Gestion locative",
    title: "Chaque paiement des propriétaires, suivi",
    chip: AVAILABLE,
    narration:
      "Chaque paiement des propriétaires est suivi, facture par facture.",
  },
  {
    id: "09-soon-rental",
    kind: "soon",
    chapter: "Gestion locative",
    title: "Bientôt dans Pratonna",
    items: ["Appels de charges", "Baux et documents de location", "États des lieux d’entrée et de sortie"],
    narration: "Bientôt : les appels de charges, les baux et les états des lieux.",
  },
  {
    id: "10-outro",
    kind: "outro",
    title: "Démo et test pilote gratuits",
    narration:
      "Démo et test pilote gratuits, sans engagement. Réservez sur pratonna point com.",
    subtitle: "Démo et test pilote gratuits, sans engagement. Réservez sur pratonna.com.",
  },
];

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const LOGO = dataUri(path.join(publicDir, "logo.png"), "image/png");
const WOMAN = dataUri(path.join(publicDir, "avatar-head.webp"), "image/webp");
const MAN = dataUri(path.join(publicDir, "avatar-man-head.webp"), "image/webp");

function html(s) {
  const subtitle = s.subtitle ?? s.narration ?? "";
  const chip = s.chip
    ? `<span class="chip ${s.chip === AVAILABLE ? "ok" : "soon"}">${s.chip}</span>`
    : "";
  let body = "";
  if (s.image) {
    body = `
      <div class="head"><span class="pill">${s.chapter}</span><h1>${s.title}</h1>${chip}</div>
      <div class="device"><div class="chrome"><i></i><i></i><i></i><span>app.pratonna.com</span></div>
        <img src="${dataUri(path.join(shots, s.image), "image/png")}"></div>`;
  } else if (s.kind === "soon") {
    body = `
      <div class="head"><span class="pill">${s.chapter}</span><h1>${s.title}</h1></div>
      <ul class="soonlist">${s.items.map((i) => `<li><span>${i}</span><span class="chip soon">${SOON}</span></li>`).join("")}</ul>`;
  } else if (s.kind === "chapter") {
    body = `<div class="center"><div class="num">${s.chapter}</div><h1 class="big">${s.title}</h1></div>`;
  } else if (s.kind === "intro") {
    body = `<div class="center"><div class="duo"><img src="${WOMAN}"><img src="${MAN}"></div>
      <img class="logo" src="${LOGO}"><h1 class="big">${s.title}</h1><p class="lead">La démo en 1 minute</p></div>`;
  } else if (s.kind === "outro") {
    body = `<div class="center"><img class="logo" src="${LOGO}"><h1 class="big">${s.title}</h1>
      <p class="lead">Sans engagement · Sans carte bancaire</p><div class="cta">Réservez votre démo sur pratonna.com</div></div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Outfit:wght@400;500;600&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1920px;height:1080px;overflow:hidden;font-family:Outfit,sans-serif;color:#f5f7ff;
 background:radial-gradient(900px 600px at 15% 10%,rgba(47,107,255,.35),transparent 70%),radial-gradient(900px 700px at 90% 90%,rgba(139,92,246,.3),transparent 70%),#060b1e;}
.head{position:absolute;top:56px;left:120px;right:120px;display:flex;align-items:center;gap:22px}
h1{font-family:Fraunces,serif;font-weight:600;font-size:52px;letter-spacing:-.01em}
.pill{padding:8px 18px;border-radius:999px;border:1px solid rgba(73,216,255,.45);color:#49d8ff;font-weight:600;font-size:22px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.chip{padding:8px 16px;border-radius:999px;font-weight:600;font-size:22px;white-space:nowrap}
.chip.ok{background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.5);color:#a7f3d0}
.chip.soon{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.5);color:#fde68a}
.device{position:absolute;left:50%;top:170px;transform:translateX(-50%);width:1380px;border-radius:18px;overflow:hidden;
 border:1px solid rgba(255,255,255,.16);box-shadow:0 50px 120px -30px rgba(47,107,255,.6)}
.chrome{height:40px;background:#0e1838;display:flex;align-items:center;gap:9px;padding:0 18px}
.chrome i{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.25)}
.chrome span{margin-left:16px;color:rgba(214,222,255,.6);font-size:17px}
.device img{display:block;width:100%;height:700px;object-fit:cover;object-position:top}
.sub{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);width:1500px;padding:18px 30px;border-radius:16px;
 background:rgba(3,6,18,.82);border:1px solid rgba(255,255,255,.1);font-size:31px;line-height:1.35;text-align:center}
.center{position:absolute;inset:0 0 140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center}
.big{font-size:84px}
.num{width:120px;height:120px;border-radius:50%;display:grid;place-items:center;font-family:Fraunces,serif;font-size:64px;
 background:linear-gradient(135deg,#2f6bff,#8b5cf6)}
.lead{font-size:36px;color:rgba(214,222,255,.8)}
.logo{height:64px}
.duo{display:flex;gap:28px}.duo img{width:190px;height:190px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.2),0 30px 70px -20px rgba(73,216,255,.6)}
.soonlist{position:absolute;top:220px;left:50%;transform:translateX(-50%);width:1200px;list-style:none;padding:0;display:grid;gap:22px}
.soonlist li{display:flex;justify-content:space-between;align-items:center;padding:30px 36px;border-radius:18px;font-size:40px;
 background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}
.cta{margin-top:14px;padding:22px 44px;border-radius:999px;font-size:38px;font-weight:600;background:linear-gradient(90deg,#2f6bff,#8b5cf6);box-shadow:0 20px 60px -15px rgba(47,107,255,.9)}
</style></head><body>${body}${subtitle ? `<div class="sub">${subtitle}</div>` : ""}</body></html>`;
}

async function tts(text, file) {
  if (fs.existsSync(file)) return;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: text,
      response_format: "wav",
      instructions:
        "Voix féminine française native, chaleureuse et posée, ton professionnel et rassurant, débit dynamique et enjoué, sans précipitation. Accent de France métropolitaine.",
    }),
  });
  if (!res.ok) throw new Error(`tts ${res.status} ${await res.text()}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const duration = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const clips = [];
for (const s of scenes) {
  const frame = path.join(tmp, `${s.id}.png`);
  await page.setContent(html(s), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: frame });

  const LEAD = 0.25;
  const TEMPO = 1.15;
  const TAIL = 0.45;
  let audio = null;
  let len = s.pause ?? 2;
  if (s.narration) {
    audio = path.join(tmp, `${s.id}.wav`);
    await tts(s.narration, audio);
    len = LEAD + duration(audio) / TEMPO + TAIL;
  }
  const clip = path.join(tmp, `${s.id}.mp4`);
  const frames = Math.round(len * 30);
  // Slow push-in (3 %) and a short fade at both ends.
  const vf = [
    "scale=3840:2160",
    `zoompan=z='1+0.03*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
    `fade=t=in:st=0:d=0.3,fade=t=out:st=${(len - 0.3).toFixed(2)}:d=0.3`,
    "format=yuv420p",
  ].join(",");
  const audioIn = audio
    ? ["-i", audio]
    : ["-f", "lavfi", "-t", String(len), "-i", "anullsrc=r=48000:cl=stereo"];
  const af = audio
    ? `atempo=${TEMPO},adelay=${LEAD * 1000}|${LEAD * 1000},apad,atrim=0:${len.toFixed(3)},aresample=48000,aformat=channel_layouts=stereo`
    : "anull";
  ff([
    "-loop", "1", "-framerate", "30", "-t", len.toFixed(3), "-i", frame,
    ...audioIn,
    "-vf", vf, "-af", af,
    "-t", len.toFixed(3),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
    clip,
  ]);
  clips.push(clip);
  console.log(s.id, len.toFixed(2), "s");
}
await browser.close();

const list = path.join(tmp, "list.txt");
fs.writeFileSync(list, clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"));
const full = path.join(tmp, "full.mp4");
ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", full]);
console.log("total", duration(full).toFixed(1), "s");

// Web versions: 1080p and 720p, loudness-normalised, streaming-ready.
const outDir = publicDir;
ff(["-i", full, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
  "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", path.join(outDir, "demo-immobilier.mp4")]);
ff(["-i", full, "-vf", "scale=1280:720", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "libx264", "-preset", "slow",
  "-crf", "26", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(outDir, "demo-immobilier-720.mp4")]);
ff(["-i", path.join(tmp, "00-intro.png"), "-vf", "scale=1280:720", "-q:v", "4", path.join(outDir, "demo-immobilier-poster.jpg")]);
console.log("written");
