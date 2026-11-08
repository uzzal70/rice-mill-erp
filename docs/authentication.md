# Authentication

## Sign-in and session lifecycle

- Email/password sign-in uses bcrypt password hashes. Access tokens are signed JWTs bound to a database session; refresh tokens are random opaque values stored only as SHA-256 hashes.
- Access-token duration defaults to 15 minutes. Refresh sessions default to 30 days and rotate the refresh token on every refresh. A previously rotated token cannot refresh again.
- Email OTP sign-in uses a random six-digit code, stored as an HMAC hash and valid for five minutes. A new code invalidates earlier outstanding codes. A code is single-use and allows at most five failed verification attempts.
- Password and OTP sign-ins create device/session records with the submitted device label, request IP, user-agent, creation time, expiry, and revocation time. Secrets are not included in session or history responses.
- Users can open **Account security** to review up to 100 recent sessions and login events, revoke their own sessions, or request an email-verification message. Revoking the current session returns the user to sign-in.
- `GET /api/v1/auth/login-history` returns the authenticated user's latest 100 success, failure, and lockout events. Events for unknown email addresses are not associated with a user account.

## Lockout and recovery

- Eight failed password or OTP verification attempts lock the account for 15 minutes. Further attempts during the lock are rejected and recorded as `LOCKED`; successful sign-in clears the failure count and lock.
- Password reset requests return the same public response whether or not an eligible account exists. The reset token is random, stored as a hash, single-use, expires after 30 minutes, and revokes existing sessions when accepted. Passwords must be at least 12 characters.
- Email verification links are single-use and expire after 24 hours. OTP sign-in also verifies the account email. The verification link destination is `/verify-email`; reset links go to `/reset-password`.
- Email-based recovery, OTP, and verification require configured SMTP (`SMTP_HOST`, `SMTP_FROM`, and optional SMTP credentials) and `APP_URL`. The API returns a service-unavailable error if delivery is not configured; it never exposes recovery tokens or OTPs in API responses.

## Endpoints

- `POST /api/v1/auth/login`, `/refresh`, `/logout`
- `POST /api/v1/auth/otp/request`, `/otp/verify`
- `POST /api/v1/auth/password-reset/request`, `/password-reset/complete`
- `POST /api/v1/auth/email-verification/request`, `/email-verification/complete`
- `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/:sessionId`
- `GET /api/v1/auth/login-history`

Public endpoints validate request DTOs and avoid account-existence responses for password reset and OTP requests. Session and history endpoints require an active session and are scoped to the authenticated user. All other protected APIs continue to enforce the existing role, company, factory, and permission checks.

## Configuration and validation

Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to unique secrets of at least 32 characters. Configure `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_DAYS`, `APP_URL`, and the SMTP settings for the intended environment. Bootstrap administrators are seeded with a verified email; created accounts may request email verification from Account security.

Authentication service unit tests cover challenge hashing/expiry behavior, OTP use limits and lockout, password lockout, successful session creation, refresh rotation, password reset session revocation, email verification, and private login-history scoping. The new login event table is added by migration `0011_auth_login_history`.
