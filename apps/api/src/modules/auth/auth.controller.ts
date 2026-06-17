import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { durationToMs } from "../../lib/jwt.js";
import { ApiError } from "../../lib/errors.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "golax_refresh";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

function getRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
}

export async function register(req: Request, res: Response): Promise<void> {
  const { user, tokens } = await authService.register(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(201).json({ user, accessToken: tokens.accessToken });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, tokens } = await authService.login(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ user, accessToken: tokens.accessToken });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = getRefreshToken(req);
  if (!token) throw ApiError.unauthorized("Missing refresh token");

  const tokens = await authService.refresh(token);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = getRefreshToken(req);
  if (token) await authService.logout(token);
  clearRefreshCookie(res);
  res.json({ success: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getProfile(req.user!.id);
  res.json({ user });
}

export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.changePassword(req.user!.id, req.body);
  res.json({ success: true });
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const resetToken = await authService.forgotPassword(req.body.email);
  // V1: no email sending. Return token in dev so it can be used directly.
  res.json({
    success: true,
    message: "If the account exists, a reset token has been generated.",
    ...(env.NODE_ENV !== "production" ? { resetToken } : {}),
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true });
}
