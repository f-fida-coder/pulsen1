import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { getUserById } from "./db";

const COOKIE_NAME = "solpulsen_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "solpulsen-secret-key-change-in-production"
);

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return res.status(401).json({ error: "Unauthorized" });
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    let userId: number;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
      userId = (payload as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await getUserById(userId);
    if (!user || !user.isActive) return res.status(401).json({ error: "Unauthorized" });

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file provided" });

    const ext = file.originalname.split(".").pop() ?? "pdf";
    const fileKey = `bills/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

    res.json({ fileKey, fileUrl: url });
  } catch (e: any) {
    console.error("[billsRoute] upload error:", e);
    res.status(500).json({ error: e.message ?? "Upload failed" });
  }
});

export default router;
