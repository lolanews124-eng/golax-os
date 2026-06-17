"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ForgotResponse {
  success: boolean;
  message: string;
  resetToken?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setResetToken(null);
    try {
      const data = await apiFetch<ForgotResponse>("/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: { email },
      });
      setMessage(data.message);
      if (data.resetToken) setResetToken(data.resetToken);
    } catch (err) {
      setMessage((err as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email to get a reset token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset token"}
            </Button>
          </form>

          {message && (
            <p className="mt-4 text-sm text-muted-foreground">{message}</p>
          )}
          {resetToken && (
            <div className="mt-4 rounded-md bg-muted p-3 text-sm">
              <p className="mb-2 font-medium">Dev mode reset token:</p>
              <code className="break-all">{resetToken}</code>
              <Link
                href={`/reset-password?token=${resetToken}`}
                className="mt-2 block text-primary hover:underline"
              >
                Continue to reset →
              </Link>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
