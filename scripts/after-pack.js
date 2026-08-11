const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  if (!fs.existsSync(appPath)) return;

  // Signature ad-hoc profonde (évite certains refus macOS)
  execSync(`codesign --force --deep --sign - "${appPath}"`, {
    stdio: "inherit",
  });

  // S'assurer que le binaire ffmpeg est exécutable
  const ffmpegCandidates = [
    path.join(appPath, "Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg"),
    path.join(appPath, "Contents/Resources/app/node_modules/ffmpeg-static/ffmpeg"),
  ];
  for (const ffmpeg of ffmpegCandidates) {
    if (fs.existsSync(ffmpeg)) {
      fs.chmodSync(ffmpeg, 0o755);
    }
  }
};
