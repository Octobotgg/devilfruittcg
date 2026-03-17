function parseBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

export function isMatchIntelV2Enabled(): boolean {
  return parseBooleanFlag(process.env.MATCH_INTEL_V2, false);
}
