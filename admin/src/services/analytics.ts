import { enquiriesService } from "./enquiries";
import { followupsService } from "./followups";
import { LEAD_SOURCES, SERVICE_OPTIONS } from "../types/domain";
import type { Enquiry, Followup, LeadSource, ServiceOption } from "../types/domain";
import { isToday, isOverdue, todayIso, isTodayInZone, monthKeyInZone } from "../utils/date";
import { browserTimezone } from "../lib/timezone";

const MIN_SOURCE_SAMPLE = 10;

export interface DashboardKpis {
  totalEnquiries: number;
  newEnquiries: number;
  followupsDue: number;
  converted: number;
  conversionRate: number;
  lost: number;
}

export interface TodaySummary {
  newEnquiriesToday: number;
  followupsToday: number;
  overdueFollowups: number;
  callsScheduledToday: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface MonthlyPoint {
  key: string;
  label: string;
  enquiries: number;
  converted: number;
  lost: number;
  followups: number;
  conversionRate: number;
}

export interface SourcePerformance {
  source: LeadSource;
  total: number;
  converted: number;
  conversionRate: number;
  sufficientSample: boolean;
}

export interface ServicePerformance {
  service: ServiceOption;
  total: number;
  converted: number;
  conversionRate: number;
  share: number;
}

export interface GrowthInsights {
  contactRate: number;
  contactRateMessage: string;
  followupConversionRate: number;
  followupConversionMessage: string;
  leadDropoffRate: number;
  leadDropoffMessage: string;
  sourcePerformance: SourcePerformance[];
  bestSource: SourcePerformance | null;
  worstSource: SourcePerformance | null;
  sourceRecommendation: string;
}

function contactedStageCount(enquiries: Enquiry[]): number {
  return enquiries.filter((e) => e.status !== "NEW").length;
}

function followupStageCount(enquiries: Enquiry[]): number {
  return enquiries.filter((e) => e.status === "FOLLOW_UP" || e.status === "CONVERTED").length;
}

export function computeKpis(enquiries: Enquiry[], followups: Followup[]): DashboardKpis {
  const totalEnquiries = enquiries.length;
  const newEnquiries = enquiries.filter((e) => e.status === "NEW").length;
  const converted = enquiries.filter((e) => e.status === "CONVERTED").length;
  const lost = enquiries.filter((e) => e.status === "LOST").length;
  const followupsDue = followups.filter(
    (f) => f.status === "SCHEDULED" && (isToday(f.scheduled_date) || isOverdue(f.scheduled_date, f.scheduled_time))
  ).length;
  return {
    totalEnquiries,
    newEnquiries,
    followupsDue,
    converted,
    lost,
    conversionRate: totalEnquiries ? (converted / totalEnquiries) * 100 : 0,
  };
}

// timezone defaults to the viewer's own browser zone — was previously comparing a UTC-sliced date
// string (e.created_at.slice(0,10)) against browser-local "today" via isToday, which could
// misbucket an enquiry near a UTC/local day boundary. isTodayInZone compares calendar dates as they
// actually appear in the given zone, closing that gap.
export function computeTodaySummary(enquiries: Enquiry[], followups: Followup[], timezone: string = browserTimezone()): TodaySummary {
  const newEnquiriesToday = enquiries.filter((e) => isTodayInZone(e.created_at, timezone)).length;
  const todaysFollowups = followups.filter((f) => f.status === "SCHEDULED" && isToday(f.scheduled_date));
  const overdueFollowups = followups.filter(
    (f) => f.status === "SCHEDULED" && !isToday(f.scheduled_date) && isOverdue(f.scheduled_date, f.scheduled_time)
  ).length;
  const callsScheduledToday = todaysFollowups.filter(
    (f) => f.contact_method === "Phone Call" || f.contact_method === "Video Call"
  ).length;
  return {
    newEnquiriesToday,
    followupsToday: todaysFollowups.length,
    overdueFollowups,
    callsScheduledToday,
  };
}

export function computeFunnel(enquiries: Enquiry[]): FunnelStage[] {
  return [
    { stage: "Enquiries", count: enquiries.length },
    { stage: "Contacted", count: contactedStageCount(enquiries) },
    { stage: "Follow-up", count: followupStageCount(enquiries) },
    { stage: "Converted", count: enquiries.filter((e) => e.status === "CONVERTED").length },
  ];
}

// timezone defaults to the viewer's own browser zone — bucket keys were previously browser-local
// (from `now`) while records were bucketed by slicing their raw UTC created_at string; the two
// could disagree near a month boundary. monthKeyInZone buckets a record by the month it actually
// falls in FOR THIS ZONE, matching how the bucket keys themselves are now also computed.
export function computeMonthlySeries(enquiries: Enquiry[], followups: Followup[], months = 6, timezone: string = browserTimezone()): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });

    const monthEnquiries = enquiries.filter((e) => monthKeyInZone(e.created_at, timezone) === key);
    const monthConverted = monthEnquiries.filter((e) => e.status === "CONVERTED").length;
    const monthLost = monthEnquiries.filter((e) => e.status === "LOST").length;
    const monthFollowups = followups.filter((f) => monthKeyInZone(f.created_at, timezone) === key).length;

    points.push({
      key,
      label,
      enquiries: monthEnquiries.length,
      converted: monthConverted,
      lost: monthLost,
      followups: monthFollowups,
      conversionRate: monthEnquiries.length ? (monthConverted / monthEnquiries.length) * 100 : 0,
    });
  }
  return points;
}

export function computeSourcePerformance(enquiries: Enquiry[]): SourcePerformance[] {
  return LEAD_SOURCES.map((source) => {
    const forSource = enquiries.filter((e) => e.source === source);
    const converted = forSource.filter((e) => e.status === "CONVERTED").length;
    return {
      source,
      total: forSource.length,
      converted,
      conversionRate: forSource.length ? (converted / forSource.length) * 100 : 0,
      sufficientSample: forSource.length >= MIN_SOURCE_SAMPLE,
    };
  }).filter((s) => s.total > 0);
}

export function computeServicePerformance(enquiries: Enquiry[]): ServicePerformance[] {
  const total = enquiries.length || 1;
  return SERVICE_OPTIONS.map((service) => {
    const forService = enquiries.filter((e) => e.service === service);
    const converted = forService.filter((e) => e.status === "CONVERTED").length;
    return {
      service,
      total: forService.length,
      converted,
      conversionRate: forService.length ? (converted / forService.length) * 100 : 0,
      share: (forService.length / total) * 100,
    };
  }).filter((s) => s.total > 0);
}

export function computeGrowthInsights(enquiries: Enquiry[]): GrowthInsights {
  const total = enquiries.length;
  const contactedCount = contactedStageCount(enquiries);
  const followupCount = followupStageCount(enquiries);
  const convertedCount = enquiries.filter((e) => e.status === "CONVERTED").length;
  const stuckAtContacted = enquiries.filter((e) => e.status === "CONTACTED").length;

  const contactRate = total ? (contactedCount / total) * 100 : 0;
  const followupConversionRate = followupCount ? (convertedCount / followupCount) * 100 : 0;
  const leadDropoffRate = contactedCount ? (stuckAtContacted / contactedCount) * 100 : 0;

  const sourcePerformance = computeSourcePerformance(enquiries);
  const qualified = sourcePerformance.filter((s) => s.sufficientSample);
  const bestSource = qualified.length
    ? [...qualified].sort((a, b) => b.conversionRate - a.conversionRate)[0]
    : null;
  const worstSource =
    qualified.length > 1 ? [...qualified].sort((a, b) => a.conversionRate - b.conversionRate)[0] : null;

  let sourceRecommendation: string;
  if (bestSource && worstSource && bestSource.source !== worstSource.source) {
    sourceRecommendation = `${bestSource.source} is your strongest source at ${bestSource.conversionRate.toFixed(0)}% conversion. Consider reducing ${worstSource.source} spend (${worstSource.conversionRate.toFixed(0)}%) and testing a new campaign.`;
  } else if (bestSource) {
    sourceRecommendation = `${bestSource.source} is converting at ${bestSource.conversionRate.toFixed(0)}%. Other sources don't yet have enough volume (10+ leads) for a confident comparison.`;
  } else {
    sourceRecommendation = "Not enough leads per source yet (10+ needed) to make a confident source recommendation.";
  }

  return {
    contactRate,
    contactRateMessage:
      contactRate >= 70
        ? `${contactRate.toFixed(0)}% of enquiries are being contacted — solid first-contact coverage.`
        : `Only ${contactRate.toFixed(0)}% of enquiries are being contacted. Improve first-contact speed.`,
    followupConversionRate,
    followupConversionMessage: followupCount
      ? `${followupConversionRate.toFixed(0)}% of leads that reach follow-up go on to convert.`
      : "No leads have reached the follow-up stage yet.",
    leadDropoffRate,
    leadDropoffMessage: contactedCount
      ? `${leadDropoffRate.toFixed(0)}% of contacted leads are not yet receiving a follow-up. Create a follow-up task immediately after every interested call.`
      : "No contacted leads yet to measure drop-off.",
    sourcePerformance,
    bestSource,
    worstSource,
    sourceRecommendation,
  };
}

export const analyticsService = {
  async load() {
    const [enquiries, followups] = await Promise.all([enquiriesService.list(), followupsService.list()]);
    return {
      kpis: computeKpis(enquiries, followups),
      today: computeTodaySummary(enquiries, followups),
      funnel: computeFunnel(enquiries),
      monthly: computeMonthlySeries(enquiries, followups),
      sourcePerformance: computeSourcePerformance(enquiries),
      servicePerformance: computeServicePerformance(enquiries),
      growth: computeGrowthInsights(enquiries),
      enquiries,
      followups,
    };
  },
  todayIso,
};
