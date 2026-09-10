import { AppUpdateSettings, CURRENT_APP_VERSION } from '../types';

/**
 * Compares two semver-like strings (e.g. "1.0.4", "1.1.0", "2.0")
 * Returns:
 *  - positive number if v1 > v2
 *  - negative number if v1 < v2
 *  - 0 if v1 === v2
 */
export function compareVersions(v1: string = '0.0.0', v2: string = '0.0.0'): number {
  const cleanV1 = v1.replace(/^v/i, '').trim();
  const cleanV2 = v2.replace(/^v/i, '').trim();

  const parts1 = cleanV1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Returns true if v1 is strictly lower than v2
 */
export function isVersionLower(currentVersion: string, targetVersion: string): boolean {
  return compareVersions(currentVersion, targetVersion) < 0;
}

export const BASE_INSTALLED_APP_VERSION = '1.0.0';

/**
 * Returns the detected client app version:
 * 1. URL query param (e.g. ?v=1.0.0 or ?apk_version=1.0.0 or ?app_version=1.0.0)
 * 2. LocalStorage ('roxfollow_installed_app_version')
 * 3. Fallback to BASE_INSTALLED_APP_VERSION (1.0.0)
 */
export function getClientAppVersion(): string {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const qv = params.get('apk_version') || params.get('app_version') || params.get('v') || params.get('version');
      if (qv && qv.trim()) {
        const clean = qv.trim().replace(/^v/i, '');
        localStorage.setItem('roxfollow_installed_app_version', clean);
        return clean;
      }
    } catch {}

    try {
      const stored = localStorage.getItem('roxfollow_installed_app_version');
      if (stored && stored.trim()) {
        return stored.trim().replace(/^v/i, '');
      }
    } catch {}
  }

  return CURRENT_APP_VERSION || BASE_INSTALLED_APP_VERSION;
}

/**
 * Saves updated client version to localStorage upon successful update
 */
export function setClientAppVersion(version: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('roxfollow_installed_app_version', version.replace(/^v/i, '').trim());
    } catch {}
  }
}

/**
 * Checks if an update is mandatory/required for the current app build
 */
export function isUpdateRequired(
  currentVersion?: string,
  updateSettings?: AppUpdateSettings
): boolean {
  if (!updateSettings || updateSettings.enabled !== true) {
    return false;
  }

  const clientVer = currentVersion || getClientAppVersion();
  const targetVersion = updateSettings.latestVersion || updateSettings.minRequiredVersion || '1.1.0';
  const minRequired = updateSettings.minRequiredVersion || targetVersion;

  // Compare versions
  const lowerThanTarget = isVersionLower(clientVer, targetVersion);
  const lowerThanMin = isVersionLower(clientVer, minRequired);

  // If forceUpdate is true and client is below target or minRequired
  if (updateSettings.forceUpdate) {
    return lowerThanTarget || lowerThanMin;
  }

  return lowerThanTarget || lowerThanMin;
}
