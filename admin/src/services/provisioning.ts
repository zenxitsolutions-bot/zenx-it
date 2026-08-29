import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto } from "./demo/collection";
import { auditService } from "./auditLogs";
import { notificationsService } from "./notifications";
import { slugify } from "../utils/slug";
import { generateId } from "../utils/id";
import type { ApplicationSlug, Company, ZenxUser, ApplicationAccess } from "../types/domain";

export interface ProvisionCustomerInput {
  enquiryId: string | null;
  companyName: string;
  companySlug: string;
  /** The company's own public website. Normalised server-side (a bare `acme.com` gains https://). */
  website?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  jobTitle: string;
  applicationSlugs: ApplicationSlug[];
  adminId: string;
  /** A temporary password set by the admin — the customer must change it on first login. */
  password: string;
}

/**
 * Mirrors admin-server's provisioning.controller.js#normalizeWebsite, so demo mode stores exactly
 * what the live backend would. Kept as a small local copy rather than shared code for the same
 * reason every other service duplicates its demo branch — the two run in different processes.
 */
function normalizeWebsite(website: string | null | undefined): string | null {
  const trimmed = website?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function isSlugTaken(slug: string): Promise<boolean> {
  if (isDemoMode) {
    return demoStore.getState().companies.some((c) => c.company_slug === slug);
  }
  const { data } = await apiClient.get<{ available: boolean }>(`/companies/check-slug/${slug}`);
  return !data.available;
}

/**
 * Turns a company name into a unique, URL-safe slug, appending -2, -3, …
 * on collision. Call once per conversion and show the result to the admin
 * before submitting — the slug is stable once a company is created.
 */
export async function generateUniqueCompanySlug(companyName: string): Promise<string> {
  const base = slugify(companyName);
  let candidate = base;
  let suffix = 2;
  while (await isSlugTaken(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Carries the server's own message, so a caller can render it directly. Mirrors AuthError. */
export class ProvisioningError extends Error {}

function errorMessage(err: unknown, fallback: string): string {
  const maybeAxios = err as { response?: { data?: { error?: string } } };
  return maybeAxios?.response?.data?.error ?? fallback;
}

export interface ProvisionCustomerResult {
  company: Company;
  user: ZenxUser;
  grants: ApplicationAccess[];
}

export const provisioningService = {
  async provisionCustomer(input: ProvisionCustomerInput): Promise<ProvisionCustomerResult> {
    if (isDemoMode) {
      const now = new Date().toISOString();
      const company: Company = {
        id: demoStore.nextId("co"),
        enquiry_id: input.enquiryId,
        company_name: input.companyName,
        company_slug: input.companySlug,
        company_email: input.email,
        company_phone: input.phone,
        website: normalizeWebsite(input.website),
        logo_url: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        zip: null,
        country: null,
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      };

      const user: ZenxUser = {
        id: generateId("usr"),
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        job_title: input.jobTitle || null,
        status: "ACTIVE",
        must_change_password: true,
        created_at: now,
        updated_at: now,
        last_login: null,
      };

      const apps = demoStore.getState().applications.filter((a) =>
        input.applicationSlugs.includes(a.slug)
      );
      const grants: ApplicationAccess[] = apps.map((app) => ({
        id: demoStore.nextId("aa"),
        user_id: user.id,
        company_id: company.id,
        application: app.slug,
        role: app.slug === "zenx-dietitian" ? "wellness_admin" : "pos_admin",
        status: "ACTIVE",
        activated_at: now,
        deactivated_at: null,
      }));

      demoStore.update((s) => ({
        ...s,
        companies: upsertInto(s.companies, company),
        zenxUsers: upsertInto(s.zenxUsers, user),
        applicationAccess: grants.reduce((acc, g) => upsertInto(acc, g), s.applicationAccess),
        customerPasswords: { ...s.customerPasswords, [user.id]: input.password },
      }));

      await auditService.log(
        input.adminId,
        "CREATE_COMPANY",
        "company",
        company.id,
        `Created company ${company.company_name} and set a temporary password for ${user.first_name} ${user.last_name}.`
      );
      for (const app of apps) {
        await auditService.log(
          input.adminId,
          "GRANT_APPLICATION_ACCESS",
          "application_access",
          company.id,
          `Activated ${app.name} access for ${company.company_name}.`
        );
      }
      await notificationsService.push({
        kind: "APPLICATION_CREATED",
        title: "Application access created",
        body: `${company.company_name} now has access to ${apps.map((a) => a.name).join(" and ") || "no applications yet"}.`,
        entity_id: company.id,
      });

      return { company, user, grants };
    }

    // Live mode: the server creates the audit_logs entries itself (one transaction — see
    // admin-server/src/controllers/provisioning.controller.js) and sends the welcome email.
    try {
      const { data } = await apiClient.post<ProvisionCustomerResult>("/companies/provision", {
        enquiryId: input.enquiryId,
        companyName: input.companyName,
        companySlug: input.companySlug,
        website: input.website || null,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email,
        jobTitle: input.jobTitle,
        applicationSlugs: input.applicationSlugs,
        password: input.password,
      });
      return data;
    } catch (err) {
      // The 409s here are the ones a caller most needs to show verbatim ("That company URL is
      // already taken" / "A customer account with this email already exists") — a raw AxiosError
      // carries only "Request failed with status code 409", which tells the admin nothing.
      throw new ProvisioningError(errorMessage(err, "Could not create the customer."));
    }
  },
};
