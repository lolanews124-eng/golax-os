export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type ProjectStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Project {
  id: string;
  name: string;
  country: string;
  city: string;
  category: string;
  targetLeads: number;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
  _count?: { companies: number; jobs?: number };
}

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface CompanyRow {
  id: string;
  name: string;
  website: string | null;
  websiteStatus: string;
  email: string | null;
  phone: string | null;
  opportunityScore: number | null;
  priority: Priority | null;
  recommendedService: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Stats {
  projectsCreated: number;
  businessesFound: number;
  auditsCompleted: number;
  emailsFound: number;
  highOpportunityLeads: number;
  researchSuccessRate: number;
}

export interface CompanyDetail {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  websiteStatus: string;
  contact: {
    email: string | null;
    phone: string | null;
    contactPage: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
  } | null;
  technicalAudit: Record<string, unknown> | null;
  seoAudit: Record<string, unknown> | null;
  conversionAudit: Record<string, unknown> | null;
  opportunity: { score: number; priority: Priority } | null;
  recommendations: { service: string; reason: string }[];
  aiAnalysis: {
    summary: string | null;
    weaknesses: string | null;
    opportunity: string | null;
  } | null;
  outreach: {
    emailSubject: string | null;
    emailBody: string | null;
    contactFormMessage: string | null;
    linkedinMessage: string | null;
    whatsappMessage: string | null;
  } | null;
}

export interface LogEntry {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}
