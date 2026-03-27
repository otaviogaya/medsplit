const sharp = require("../web/node_modules/sharp");
const path = require("path");

const src = path.resolve(__dirname, "../web/app/apple-icon.png");
const outDir = path.resolve(__dirname, "../web/app");

async function run() {
  const meta = await sharp(src).metadata();
  console.log("Source (apple-icon):", meta.width, "x", meta.height);

  await sharp(src)
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, "favicon.ico"));
  console.log("favicon.ico: 32x32");

  await sharp(src)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, "icon.png"));
  console.log("icon.png: 192x192");
}

run().catch(console.error);
