const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");
const dmg = path.join(dist, "CAMPHOTOS-1.0.3-arm64.dmg");
const zip = path.join(dist, "CAMPHOTOS-1.0.3-arm64-mac.zip");

for (const file of [dmg, zip]) {
  if (!fs.existsSync(file)) {
    console.warn("Introuvable:", file);
    continue;
  }
  // Retirer quarantaine locale éventuelle
  try {
    execSync(`xattr -cr "${file}"`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  const size = fs.statSync(file).size;
  console.log(`OK ${path.basename(file)} (${Math.round(size / 1024 / 1024)} Mo)`);
}

if (fs.existsSync(dmg)) {
  execSync(`hdiutil verify "${dmg}"`, { stdio: "inherit" });
}
