export function getSavedTwitchChannel() {
  return localStorage.getItem("twitch_channel") || "";
}

export function saveTwitchChannel(channel) {
  const cleanedChannel = channel.trim().toLowerCase();
  localStorage.setItem("twitch_channel", cleanedChannel);
  return cleanedChannel;
}
