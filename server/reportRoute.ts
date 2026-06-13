/**
 * Express route for PDF report generation.
 * GET /api/reports/roi-pdf?userId=<id>&from=<ISO>&to=<ISO>
 * Admin can request any userId; regular users can only request their own.
 */
import { Router, Request, Response } from "express";
import { fetchRoiReportData, generateRoiPdf } from "./roiPdfGenerator";
import { authenticateRequest } from "./_core/context";

const reportRouter = Router();

reportRouter.get("/roi-pdf", async (req: Request, res: Response) => {
  try {
    // Authenticate
    const user = await authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestingUserId = user.id;
    const requestingRole = user.role ?? "user";

    // Parse params
    const targetUserIdRaw = req.query.userId as string | undefined;
    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;

    // Default: last 30 days
    const toDate = toRaw ? new Date(toRaw) : new Date();
    const fromDate = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Determine target user
    let targetUserId = requestingUserId;
    if (targetUserIdRaw) {
      const parsed = parseInt(targetUserIdRaw, 10);
      if (isNaN(parsed)) {
        res.status(400).json({ error: "Invalid userId" });
        return;
      }
      // Only admins can generate reports for other users
      if (parsed !== requestingUserId && requestingRole !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      targetUserId = parsed;
    }

    // Fetch data and generate PDF
    const data = await fetchRoiReportData(targetUserId, fromDate, toDate);
    const pdfBuffer = generateRoiPdf(data);

    // Sanitize filename
    const safeName = data.customerName.replace(/[^a-zA-Z0-9\u00C0-\u017E\s-]/g, "").replace(/\s+/g, "_");
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);
    const filename = `SolPulsen_ROI_${safeName}_${fromStr}_${toStr}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);

    // Send ROI report email to requesting user (non-blocking)
    if (user.email) {
      const { sendRoiReportEmail } = await import("./emailService");
      sendRoiReportEmail({
        to: user.email,
        customerName: data.customerName,
        fromDate,
        toDate,
        totalSavingsSek: data.summary.totalSavingsSek,
        yearlyProjectedSek: data.summary.yearlyProjectedSavingsSek,
        executedActions: data.summary.executedActions,
      }).catch(e => console.error("[report email]", e));
    }
  } catch (err: any) {
    console.error("[reportRoute] PDF generation error:", err);
    res.status(500).json({ error: err.message ?? "PDF generation failed" });
  }
});

export { reportRouter };
