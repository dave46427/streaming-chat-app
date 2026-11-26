$ErrorActionPreference = "Stop"

$project = "C:\Users\david\streaming-chat-app"
$serverFile = Join-Path $project "server.js"
$backupFile = Join-Path $project ("server-BACKUP-BEFORE-FACEBOOK-RATE-LIMIT-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".js")

if (-not (Test-Path $serverFile)) {
    throw "Could not find $serverFile"
}

Copy-Item $serverFile $backupFile -Force
$text = Get-Content $serverFile -Raw

function Replace-Exact([string]$old, [string]$new, [string]$label) {
    if (-not $script:text.Contains($old)) {
        throw "Could not find the expected $label code. No changes were saved. Backup: $backupFile"
    }
    $script:text = $script:text.Replace($old, $new)
}

Replace-Exact `
'const FACEBOOK_POLL_INTERVAL_MS = Math.max(2500, Number(process.env.FACEBOOK_POLL_INTERVAL_MS || 4000));' `
'const FACEBOOK_POLL_INTERVAL_MS = Math.max(15000, Number(process.env.FACEBOOK_POLL_INTERVAL_MS || 15000));
const FACEBOOK_RATE_LIMIT_COOLDOWN_MS = Math.max(15 * 60 * 1000, Number(process.env.FACEBOOK_RATE_LIMIT_COOLDOWN_MS || 60 * 60 * 1000));' `
'Facebook polling interval'

Replace-Exact `
'let facebookInitialCommentsLoaded = false;' `
'let facebookInitialCommentsLoaded = false;
let facebookRateLimitedUntil = 0;
let facebookLastRateLimitNoticeAt = 0;' `
'Facebook state variables'

$oldReader = @'
async function readFacebookJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || data?.error_description || `Facebook returned HTTP ${response.status}.`);
  }
  return data;
}
'@

$newReader = @'
class FacebookApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "FacebookApiError";
    this.code = Number(details.code || 0);
    this.subcode = Number(details.error_subcode || 0);
    this.httpStatus = Number(details.httpStatus || 0);
    this.isRateLimit = this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613 || this.code === 80001;
  }
}

function facebookCooldownRemainingMs() {
  return Math.max(0, facebookRateLimitedUntil - Date.now());
}

function facebookCooldownMessage() {
  const minutes = Math.max(1, Math.ceil(facebookCooldownRemainingMs() / 60000));
  return `Facebook has temporarily rate-limited DavaBridge. Automatic Facebook requests are paused for about ${minutes} more minute${minutes === 1 ? "" : "s"}.`;
}

function activateFacebookRateLimitCooldown(error) {
  facebookRateLimitedUntil = Math.max(facebookRateLimitedUntil, Date.now() + FACEBOOK_RATE_LIMIT_COOLDOWN_MS);
  const now = Date.now();
  if (now - facebookLastRateLimitNoticeAt > 60000) {
    facebookLastRateLimitNoticeAt = now;
    console.warn(`Facebook rate limit detected. Pausing Facebook Graph API requests until ${new Date(facebookRateLimitedUntil).toISOString()}.`, error.message);
    broadcastJson({
      type: "facebook_status",
      connected: facebookConnection.connected,
      live: Boolean(currentFacebookLiveId),
      rateLimited: true,
      retryAfter: new Date(facebookRateLimitedUntil).toISOString(),
      status: facebookCooldownMessage(),
    });
  }
}

async function readFacebookJson(url, options = {}) {
  if (facebookCooldownRemainingMs() > 0) {
    const cooldownError = new FacebookApiError(facebookCooldownMessage(), { code: 4, httpStatus: 429 });
    cooldownError.isLocalCooldown = true;
    throw cooldownError;
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    const details = data?.error || {};
    const error = new FacebookApiError(
      details.message || data?.error_description || `Facebook returned HTTP ${response.status}.`,
      { ...details, httpStatus: response.status }
    );
    if (error.isRateLimit || response.status === 429) activateFacebookRateLimitCooldown(error);
    throw error;
  }

  return data;
}
'@
Replace-Exact $oldReader $newReader 'Facebook API reader'

Replace-Exact `
'async function pollFacebookComments() {
  if (facebookPollBusy || !facebookConnection.connected || !facebookConnection.pages.length) return;' `
'async function pollFacebookComments() {
  if (facebookPollBusy || !facebookConnection.connected || !facebookConnection.pages.length) return;
  if (facebookCooldownRemainingMs() > 0) return;' `
'Facebook polling guard'

$oldCatch = @'
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not receive Facebook Live comments.";
    console.error("Facebook comment polling error:", message);
    broadcastJson({ type: "facebook_status", connected: true, live: Boolean(currentFacebookLiveId), status: `Facebook comment error: ${message}` });
  } finally {
'@
$newCatch = @'
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not receive Facebook Live comments.";
    if (!(error instanceof FacebookApiError && error.isLocalCooldown)) {
      console.error("Facebook comment polling error:", message);
    }
    broadcastJson({
      type: "facebook_status",
      connected: true,
      live: Boolean(currentFacebookLiveId),
      rateLimited: error instanceof FacebookApiError ? error.isRateLimit : false,
      retryAfter: facebookRateLimitedUntil ? new Date(facebookRateLimitedUntil).toISOString() : "",
      status: error instanceof FacebookApiError && error.isRateLimit ? facebookCooldownMessage() : `Facebook comment error: ${message}`,
    });
  } finally {
'@
Replace-Exact $oldCatch $newCatch 'Facebook polling error handler'

Replace-Exact `
'app.get("/api/facebook/live-status", async (request, response) => {
  if (!facebookConnection.connected) {' `
'app.get("/api/facebook/live-status", async (request, response) => {
  if (!facebookConnection.connected) {' `
'Facebook live status route'

# Insert cooldown response after the connected check block using a precise nearby marker.
$marker = @'
  if (!facebookConnection.pages.length) {
    return response.status(404).json({ ok: false, connected: true, live: false, error: "No Facebook Pages were found." });
  }

  try {
'@
$replacement = @'
  if (!facebookConnection.pages.length) {
    return response.status(404).json({ ok: false, connected: true, live: false, error: "No Facebook Pages were found." });
  }
  if (facebookCooldownRemainingMs() > 0) {
    return response.status(429).json({
      ok: false,
      connected: true,
      live: Boolean(currentFacebookLiveId),
      rateLimited: true,
      retryAfter: new Date(facebookRateLimitedUntil).toISOString(),
      error: facebookCooldownMessage(),
    });
  }

  try {
'@
Replace-Exact $marker $replacement 'Facebook live-status cooldown guard'

# Add a cooldown guard to send-message without generating another Graph request.
$sendMarker = @'
  if (!facebookConnection.pages.length) return response.status(404).json({ ok: false, sent: false, error: "No Facebook Pages were found." });

  try {
'@
$sendReplacement = @'
  if (!facebookConnection.pages.length) return response.status(404).json({ ok: false, sent: false, error: "No Facebook Pages were found." });
  if (facebookCooldownRemainingMs() > 0) {
    return response.status(429).json({
      ok: false,
      sent: false,
      rateLimited: true,
      retryAfter: new Date(facebookRateLimitedUntil).toISOString(),
      error: facebookCooldownMessage(),
    });
  }

  try {
'@
Replace-Exact $sendMarker $sendReplacement 'Facebook send-message cooldown guard'

Set-Content -Path $serverFile -Value $text -Encoding utf8

Push-Location $project
try {
    node --check .\server.js
    if ($LASTEXITCODE -ne 0) {
        Copy-Item $backupFile $serverFile -Force
        throw "Syntax check failed. The original server.js was restored from $backupFile"
    }

    npm run build
    if ($LASTEXITCODE -ne 0) {
        Copy-Item $backupFile $serverFile -Force
        throw "Build failed. The original server.js was restored from $backupFile"
    }

    git add server.js
    git commit -m "Add Facebook rate-limit cooldown and reduce polling"
    if ($LASTEXITCODE -ne 0) { throw "Git commit failed. The fixed file is still saved locally." }

    git push
    if ($LASTEXITCODE -ne 0) { throw "Git push failed. The commit is saved locally and can be pushed again." }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "FACEBOOK RATE-LIMIT FIX APPLIED AND PUSHED" -ForegroundColor Green
Write-Host "Backup created at: $backupFile" -ForegroundColor Cyan
Write-Host "Do not press Facebook Connect repeatedly while Meta's current limit clears." -ForegroundColor Yellow
