import { runConsultationScheduleGenerationJob } from './consultationScheduleService.js';
import { env } from '../config/env.js';

// In-process interval — no new dependency, the exact pattern already used for the email queue
// worker (server/src/emails/worker.js). Runs once immediately (so a fresh deploy/restart doesn't
// wait a full interval to fill a brand-new schedule's window) and then on a fixed cadence
// thereafter. Every tick is idempotent (see consultationScheduleService.js#generateForSchedule), so
// there's no harm in it also running right after an explicit save/regenerate elsewhere.
export function startConsultationScheduleJob() {
  runConsultationScheduleGenerationJob().catch((err) => console.error('[consultation-schedule-job] initial run failed:', err));

  const handle = setInterval(() => {
    runConsultationScheduleGenerationJob().catch((err) => console.error('[consultation-schedule-job] run failed:', err));
  }, env.consultationScheduleJobIntervalMs);
  handle.unref?.(); // never keep the process alive on its own (e.g. during tests/scripts)
  console.log(`[consultation-schedule-job] running every ${env.consultationScheduleJobIntervalMs}ms`);
  return handle;
}
