import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { authenticateRequest } from "./_core/context";

const router = Router();

// Memory storage — keep file in RAM, then push to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.post(
  "/api/upload-document",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      // Verify session — only logged-in admins may upload
      const user = await authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (user.role !== "admin") {
        res.status(403).json({ error: "Forbidden — admin only" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const targetUserId = req.body.targetUserId;
      if (!targetUserId) {
        res.status(400).json({ error: "targetUserId is required" });
        return;
      }

      // Build a unique S3 key
      const ext = req.file.originalname.split(".").pop() || "pdf";
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const fileKey = `customer-docs/${targetUserId}/${ts}-${rand}.${ext}`;

      // Upload to S3
      const { url: fileUrl } = await storagePut(
        fileKey,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({ fileKey, fileUrl });
    } catch (err: any) {
      console.error("[upload-document]", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);

export { router as uploadRouter };
