import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import * as authController from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);

authRouter.post("/refresh", asyncHandler(authController.refresh));

authRouter.post("/logout", asyncHandler(authController.logout));

authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

authRouter.get("/me", requireAuth, asyncHandler(authController.me));

authRouter.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword),
);
