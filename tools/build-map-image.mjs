/* Kartbilderna: syr ihop spelets egen kartrendering ur paldb:s kakel.
 *
 *   node tools/build-map-image.mjs tree   → public/img/worldtree.webp
 *   node tools/build-map-image.mjs main   → public/img/worldmap.webp
 *
 * Bilden hämtas EN gång och checkas in – appen laddar aldrig något från paldb
 * vid körning, och installerade kopior ska fungera utan nät. Materialet är
 * Pocketpairs (attribuerat i NOTICE, tillsammans med paldb.cc).
 *
 * Fyra saker som är mätta fram, inte gissade:
 *
 * 1. **z4 är sista nivån med riktiga kakel.** Leaflet-lagret på paldb säger
 *    `maxNativeZoom: 4, tileSize: 512`, och rutnätet slutar vid x/y = 15:
 *    16 × 16 × 512 = 8192², alltså exakt samma upplösning som huvudkartan
 *    redan ligger i. z5 svarar 404 – allt ovanför skalas upp i webbläsaren.
 * 2. **CDN:en kräver en referer.** Utan `referer: paldb.cc` svarar
 *    cdn.paldb.cc 403 på kakel-URL:erna (men 200 på z0). Utan Chrome-liknande
 *    user-agent likaså. Det är inget kringgående av en betalvägg – sidan är
 *    öppen – men en naken `fetch` ser ut som en skrapa och blockas.
 * 3. **Tomma kakel är 542 byte** och finns för varje ruta i rutnätet, så en
 *    404 mitt i rutnätet betyder att formen ändrats och inte att hörnet är
 *    tomt. Därför kastar vi hellre än att lämna ett hål i bilden.
 * 4. **Resultatet plattas mot havsfärgen** (#06070c, samma som `.wmap` i
 *    globals.css). Kaklen har alfa i kanterna; behåller man den blir filen
 *    större utan att se annorlunda ut, eftersom ramen bakom har just den
 *    färgen.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(import.meta.dirname, "..", "public", "img");

/** Kartorna paldb har, och vad de heter hos oss. `dir` är kakelmappen i
 *  `imageMapDir` på respektive sida; `referer` måste peka på den sidan. */
const MAPS = {
  main: { dir: "map8", out: "worldmap.webp", referer: "https://paldb.cc/en/Map" },
  tree: { dir: "treemap8", out: "worldtree.webp", referer: "https://paldb.cc/en/The_World_Tree" },
};

const ZOOM = 4;
const TILES = 16;
const TILE_PX = 512;
const SIZE = TILES * TILE_PX;
const SEA = { r: 0x06, g: 0x07, b: 0x0c };
/** Samtidiga hämtningar. Åtta räcker för 256 kakel på några sekunder och är
 *  hänsynsfullt mot en sida som inte tjänar något på att vara vår CDN. */
const CONCURRENCY = 8;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
  + "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function tile(map, x, y) {
  const url = `https://cdn.paldb.cc/image/${map.dir}/z${ZOOM}x${x}y${y}.webp`;
  const res = await fetch(url, { headers: { "user-agent": UA, referer: map.referer, accept: "image/webp,*/*" } });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}. Rutnätet ska vara ${TILES}×${TILES} på z${ZOOM} `
      + "– svarar en ruta 404 har paldb bytt kakelform, och bilden skulle få ett hål.");
  }
  return Buffer.from(await res.arrayBuffer());
}

async function build(name) {
  const map = MAPS[name];
  if (!map) throw new Error(`Okänd karta "${name}". Välj: ${Object.keys(MAPS).join(", ")}.`);

  const jobs = [];
  for (let y = 0; y < TILES; y++) for (let x = 0; x < TILES; x++) jobs.push({ x, y });

  const parts = new Array(jobs.length);
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let i = next++; i < jobs.length; i = next++) {
      const { x, y } = jobs[i];
      parts[i] = { input: await tile(map, x, y), left: x * TILE_PX, top: y * TILE_PX };
      if (++done % 32 === 0) console.log(`  ${done}/${jobs.length} kakel`);
    }
  }));

  await mkdir(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, map.out);
  const buf = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { ...SEA, alpha: 1 } } })
    .composite(parts)
    .flatten({ background: SEA })
    .webp({ quality: 74, effort: 6 })
    .toBuffer();
  await writeFile(out, buf);
  console.log(`${map.out}: ${SIZE}² px, ${(buf.length / 1048576).toFixed(2)} MB`);
}

const which = process.argv[2];
if (!which) {
  console.error(`Ange karta: ${Object.keys(MAPS).join(" | ")}`);
  process.exit(1);
}
await build(which);
