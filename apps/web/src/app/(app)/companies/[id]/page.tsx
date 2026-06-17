"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CompanyDetail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

function Bool({ value }: { value: unknown }) {
  return value ? (
    <Badge variant="success">Yes</Badge>
  ) : (
    <Badge variant="secondary">No</Badge>
  );
}

function MessageBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{title}</p>
      <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
        {text}
      </pre>
    </div>
  );
}

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ company: CompanyDetail }>(`/companies/${params.id}`)
      .then((d) => setCompany(d.company))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (!company) {
    return <p className="text-muted-foreground">Company not found.</p>;
  }

  const tech = company.technicalAudit as Record<string, unknown> | null;
  const seo = company.seoAudit as Record<string, unknown> | null;
  const conv = company.conversionAudit as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => history.back()}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          {company.opportunity && (
            <Badge
              variant={
                company.opportunity.priority === "HIGH"
                  ? "destructive"
                  : company.opportunity.priority === "MEDIUM"
                    ? "warning"
                    : "secondary"
              }
            >
              Score {company.opportunity.score} · {company.opportunity.priority}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Category" value={company.category} />
            <Field
              label="Location"
              value={`${company.city ?? ""}, ${company.country ?? ""}`}
            />
            <Field label="Address" value={company.address} />
            <Field
              label="Website"
              value={
                company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Visit
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Field label="Website Status" value={company.websiteStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Email" value={company.contact?.email} />
            <Field label="Phone" value={company.contact?.phone} />
            <Field
              label="Contact Page"
              value={company.contact?.contactPage}
            />
            <Field label="Facebook" value={company.contact?.facebook} />
            <Field label="Instagram" value={company.contact?.instagram} />
            <Field label="LinkedIn" value={company.contact?.linkedin} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Performance" value={tech?.performanceScore as number} />
            <Field
              label="Accessibility"
              value={tech?.accessibilityScore as number}
            />
            <Field
              label="Best Practices"
              value={tech?.bestPracticesScore as number}
            />
            <Field label="SSL" value={<Bool value={tech?.sslStatus} />} />
            <Field
              label="Broken Links"
              value={(tech?.brokenLinks as number) ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="SEO Score" value={seo?.seoScore as number} />
            <Field label="Title" value={<Bool value={seo?.titlePresent} />} />
            <Field
              label="Meta Description"
              value={<Bool value={seo?.metaDescriptionPresent} />}
            />
            <Field label="H1" value={<Bool value={seo?.h1Present} />} />
            <Field
              label="Canonical"
              value={<Bool value={seo?.canonicalPresent} />}
            />
            <Field label="robots.txt" value={<Bool value={seo?.robotsPresent} />} />
            <Field
              label="sitemap.xml"
              value={<Bool value={seo?.sitemapPresent} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Contact Form" value={<Bool value={conv?.contactForm} />} />
            <Field label="WhatsApp" value={<Bool value={conv?.whatsappButton} />} />
            <Field label="Call Button" value={<Bool value={conv?.callButton} />} />
            <Field label="Booking Form" value={<Bool value={conv?.bookingForm} />} />
            <Field label="Quote Form" value={<Bool value={conv?.quoteForm} />} />
            <Field label="Reviews" value={<Bool value={conv?.reviewsPresent} />} />
            <Field
              label="Social Links"
              value={<Bool value={conv?.socialLinksPresent} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              company.recommendations.map((r, i) => (
                <div key={i}>
                  <Badge>{r.service}</Badge>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.reason}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {company.aiAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Summary</p>
              <p className="text-muted-foreground">
                {company.aiAnalysis.summary}
              </p>
            </div>
            <div>
              <p className="font-semibold">Weaknesses</p>
              <pre className="whitespace-pre-wrap text-muted-foreground">
                {company.aiAnalysis.weaknesses}
              </pre>
            </div>
            <div>
              <p className="font-semibold">Opportunity</p>
              <p className="text-muted-foreground">
                {company.aiAnalysis.opportunity}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {company.outreach && (
        <Card>
          <CardHeader>
            <CardTitle>Outreach Drafts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MessageBlock
              title={`Email — ${company.outreach.emailSubject ?? ""}`}
              text={company.outreach.emailBody}
            />
            <MessageBlock
              title="Contact Form Message"
              text={company.outreach.contactFormMessage}
            />
            <MessageBlock
              title="LinkedIn Message"
              text={company.outreach.linkedinMessage}
            />
            <MessageBlock
              title="WhatsApp Message"
              text={company.outreach.whatsappMessage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
