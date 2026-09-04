import * as staffService from '../../services/app/staff.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const cid = (req) => req.tenant.companyId

/** Client-side view of who is assigned, for one staff kind. */
export const makeAssignmentController = (kind) => ({
  list: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await staffService.listClientAssignments(kind, cid(req), req.params.id) })
  }),

  set: asyncHandler(async (req, res) => {
    const data = await staffService.setClientAssignments(
      kind,
      cid(req),
      req.params.id,
      req.body.staffUserIds,
      req.user.id,
    )
    res.json({ success: true, message: 'Assignments updated', data })
  }),
})
