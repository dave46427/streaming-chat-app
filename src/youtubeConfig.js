// StreamBridge YouTube OAuth configuration
// Safe for browser use: contains the public Client ID only.

export const YOUTUBE_CLIENT_ID =
  "17121496748-e0duenn3qs5ls9623cli9ijnnoupapkq.apps.googleusercontent.com";

export const YOUTUBE_SCOPE =
  "https://www.googleapis.com/auth/youtube.force-ssl";

export function getYouTubeRedirectUri() {
  return `${window.location.origin}/`;
}
