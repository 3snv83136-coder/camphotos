const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const PORT = 3847;
const CAPTURES_DIR = path.join(__dirname, "captures");

if (!fs.existsSync(CAPTURES_DIR)) {
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CAPTURES_DIR),
  filename: (_req, file, cb) => {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `capture_${stamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use("/captures", express.static(CAPTURES_DIR));

app.post("/api/capture", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "Aucune image reçue" });
  }
  res.json({
    ok: true,
    filename: req.file.filename,
    path: path.join("captures", req.file.filename),
    url: `/captures/${req.file.filename}`,
  });
});

app.get("/api/captures", (_req, res) => {
  const files = fs
    .readdirSync(CAPTURES_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort()
    .reverse()
    .map((filename) => ({
      filename,
      url: `/captures/${filename}`,
    }));
  res.json({ ok: true, captures: files });
});

app.listen(PORT, () => {
  console.log(`\n  CAMPHOTOS — visionneuse inspection`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  Captures → ${CAPTURES_DIR}\n`);
});
