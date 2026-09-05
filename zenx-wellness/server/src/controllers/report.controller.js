import path from 'node:path';
import {
  listReports as queryReports,
  createReport as createReportRecord,
  findReportById,
  addReportFeedback as addReportFeedbackRecord,
  deleteReportById,
} from '../models/Report.js';
import { listClientIdsByDietitian } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient, assertUserInCompany } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';
import { uploadsDir } from '../middleware/upload.js';

// RFC 6266: an ASCII-safe `filename` for older clients, plus the real name (which may contain
// non-ASCII characters multer never restricted) via the `filename*` extended parameter.
function contentDispositionHeader(fileName) {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export const listReports = asyncHandler(async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.user.role === 'client') {
    filter.client = req.user.id;
  } else if (req.query.client) {
    // Company-checks the client too — see assertDietitianOwnsClient's own comment.
    await assertDietitianOwnsClient(req, req.query.client);
    filter.client = req.query.client;
  } else if (req.user.role === 'dietitian') {
    // No ?client= given: default to "my clients' reports", not every report in the org.
    filter.clientIn = await listClientIdsByDietitian(req.user.id);
  }
  // role === 'admin' with no ?client=: filter stays companyId-only — every report in their org,
  // not the whole platform.

  const reports = await queryReports(filter);
  res.json(reports.map((r) => toClientShape(r)));
});

export const createReport = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('file is required');

  const report = await createReportRecord({
    client: req.user.id,
    fileName: req.file.originalname,
    filePath: req.file.filename,
    note: req.body.note,
  });
  res.status(201).json(toClientShape(report));
});

// Appends one entry to the report's feedback thread (and updates status alongside) rather than
// replacing a single review field — a report can go through several rounds of dietitian review.
export const addReportFeedback = asyncHandler(async (req, res) => {
  const existing = await findReportById(req.params.id);
  if (!existing) throw ApiError.notFound('Report not found');
  await assertUserInCompany(req, existing.client);

  const report = await addReportFeedbackRecord(req.params.id, {
    authorId: req.user.id,
    authorName: req.user.name,
    message: req.body.message,
    status: req.body.status,
  });
  res.json(toClientShape(report));
});

// Spec §2026-round2-fixes item 6: the file used to be served through an unauthenticated
// express.static mount (see app.js) — reachable by anyone with the URL, no login required at all.
// Fixed by serving it only here, behind the same authenticate/blockIfMustChangePassword stack
// every other /api/reports route already sits behind, plus the same per-role ownership rule
// listReports above already enforces: a client only their own report, a dietitian only a report
// belonging to one of their own assigned clients, admin any.
export const getReportFile = asyncHandler(async (req, res, next) => {
  const report = await findReportById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  await assertUserInCompany(req, report.client);

  if (req.user.role === 'client') {
    if (String(report.client) !== req.user.id) throw ApiError.forbidden();
  } else if (req.user.role === 'dietitian') {
    await assertDietitianOwnsClient(req, report.client);
  }
  // admin: unrestricted, same as every other report route.

  // path.basename strips any directory components before joining — defense in depth against a
  // filePath that somehow predates the upload.js path-traversal fix, so a read here can never
  // escape uploadsDir even if a write once could have.
  const absolutePath = path.join(uploadsDir, path.basename(report.filePath));

  // Overrides helmet's default same-origin Cross-Origin-Resource-Policy for this one response —
  // without it, the browser blocks the client app (a different origin in production: Netlify vs.
  // Render) from loading this file at all, even though CORS itself allows the request through.
  // `inline` (not `attachment`) lets the browser preview the file directly instead of forcing a
  // download; the client's own "Download original" button handles downloading from the already-
  // fetched bytes instead of relying on this header.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Disposition', contentDispositionHeader(report.fileName));

  res.sendFile(absolutePath, (err) => {
    if (!err) return;
    if (err.code === 'ENOENT') return next(ApiError.notFound('The uploaded file could not be found on the server'));
    if (!res.headersSent) next(err);
  });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await findReportById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  await assertUserInCompany(req, report.client);
  if (req.user.role !== 'admin' && String(report.client) !== req.user.id) throw ApiError.forbidden();

  await deleteReportById(req.params.id);
  res.status(204).send();
});
