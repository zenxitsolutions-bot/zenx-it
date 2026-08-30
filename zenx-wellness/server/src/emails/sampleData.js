// Sample params for each template, keyed by template_key — used by the manual test tool
// (src/scripts/sendTestEmail.js) so firing a test send never requires hand-typing every
// placeholder. Kept next to the templates themselves so a new template's sample data lives beside
// the thing it demonstrates.
const SAMPLE_CALL_ICS = {
  callId: 'sample-call-id',
  summary: 'Nourishly call with Dr. Asha Rao',
  description: 'Your call with Dr. Asha Rao via Nourishly.',
  url: 'http://localhost:5173/app/calls',
  organizer: { name: 'Dr. Asha Rao', email: 'dietitian@nourishly.test' },
  attendee: { name: 'Priya Sharma', email: 'client@nourishly.test' },
};

export const SAMPLE_DATA = {
  'enquiry-acknowledgment': {
    lead_name: 'Priya Sharma',
    goal: 'Weight loss',
  },
  'client-welcome': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    plan_name: 'Weight Loss — Phase 1',
    plan_duration: '3 months (23 Aug 2026 – 23 Nov 2026)',
    temp_password: 'Tempo1234!',
    login_url: 'http://localhost:5173/login',
  },
  'plan-published': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    plan_name: 'Weekly nourish plan',
    week_range: '25 Aug 2026 – 31 Aug 2026',
    login_url: 'http://localhost:5173/app/meals',
  },
  'call-scheduled': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    meeting_time: 'Wednesday, 26 Aug 2026, 10:00 AM (Asia/Kolkata)',
    meeting_link: 'http://localhost:5173/app/calls',
    join_url: 'https://meet.google.com/abc-defg-hij',
    join_label: 'Join Google Meet',
    ics: { ...SAMPLE_CALL_ICS, sequence: 0, start: '2026-08-26T04:30:00.000Z' },
  },
  'call-scheduled-dietitian': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    meeting_time: 'Wednesday, 26 Aug 2026, 10:00 AM (Asia/Kolkata)',
    meeting_link: 'http://localhost:5173/app/calls',
    join_url: 'https://meet.google.com/abc-defg-hij',
    join_label: 'Join Google Meet',
    ics: { ...SAMPLE_CALL_ICS, sequence: 0, start: '2026-08-26T04:30:00.000Z' },
  },
  'call-rescheduled': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    meeting_time: 'Thursday, 27 Aug 2026, 3:00 PM (Asia/Kolkata)',
    previous_meeting_time: 'Wednesday, 26 Aug 2026, 10:00 AM (Asia/Kolkata)',
    meeting_link: 'http://localhost:5173/app/calls',
    join_url: 'https://meet.google.com/abc-defg-hij',
    join_label: 'Join Google Meet',
    ics: { ...SAMPLE_CALL_ICS, sequence: 1, start: '2026-08-27T09:30:00.000Z' },
  },
  'call-rescheduled-dietitian': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    meeting_time: 'Thursday, 27 Aug 2026, 3:00 PM (Asia/Kolkata)',
    previous_meeting_time: 'Wednesday, 26 Aug 2026, 10:00 AM (Asia/Kolkata)',
    meeting_link: 'http://localhost:5173/app/calls',
    join_url: 'https://meet.google.com/abc-defg-hij',
    join_label: 'Join Google Meet',
    ics: { ...SAMPLE_CALL_ICS, sequence: 1, start: '2026-08-27T09:30:00.000Z' },
  },
  'call-cancelled': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    meeting_time: 'Thursday, 27 Aug 2026, 3:00 PM (Asia/Kolkata)',
    meeting_link: 'http://localhost:5173/app/calls',
    join_url: 'https://meet.google.com/abc-defg-hij',
    join_label: 'Join Google Meet',
    ics: { ...SAMPLE_CALL_ICS, sequence: 2, start: '2026-08-27T09:30:00.000Z' },
  },
  'call-cancelled-dietitian': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    meeting_time: 'Thursday, 27 Aug 2026, 3:00 PM (Asia/Kolkata)',
    meeting_link: 'http://localhost:5173/app/calls',
    join_url: 'https://meet.google.com/abc-defg-hij',
    join_label: 'Join Google Meet',
    ics: { ...SAMPLE_CALL_ICS, sequence: 2, start: '2026-08-27T09:30:00.000Z' },
  },
  'consultation-schedule-generated': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    count: '8',
    date_range: '26 Aug 2026 – 21 Oct 2026',
    login_url: 'http://localhost:5173/app/calls',
  },
  'consultation-schedule-generated-dietitian': {
    client_name: 'Priya Sharma',
    dietitian_name: 'Dr. Asha Rao',
    count: '8',
    date_range: '26 Aug 2026 – 21 Oct 2026',
    login_url: 'http://localhost:5173/app/calls',
    gap_notice: "Note: 1 occurrence couldn't be scheduled and needs your attention.",
  },
};

export const TEMPLATE_KEYS = Object.keys(SAMPLE_DATA);
