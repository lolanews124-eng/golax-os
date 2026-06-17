import { prisma } from "@golax/db";
import { ApiError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  durationToMs,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from "../../lib/jwt.js";
import { env } from "../../config/env.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "./auth.schemas.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

async function issueTokens(user: {
  id: string;
  email: string;
}): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
    },
  });

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

export async function refresh(rawToken: string): Promise<AuthTokens> {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  // Rotate: revoke the used token and issue a new pair.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  return issueTokens(stored.user);
}

export async function logout(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revoked: false },
    data: { revoked: true },
  });
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  return toPublicUser(user);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  // Invalidate all existing refresh tokens after a password change.
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

// Returns the reset token. In V1 there is no email sending, so the API simply
// returns the token (the user/dev uses it to reset). Wire email later.
export async function forgotPassword(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null; // do not reveal whether the email exists

  const rawToken = generateRefreshToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + durationToMs("1h")),
    },
  });
  return rawToken;
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revoked: false },
      data: { revoked: true },
    }),
  ]);
}
