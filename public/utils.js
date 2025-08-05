const MAX_DATA_AGE_SECONDS = 15;

export function formatSecondsToHMS(seconds) {
    if (isNaN(seconds) || seconds < 0) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
};

export function formatTimeAgo(isoString) {
    if (!isoString) return "Never";
    const seconds = Math.round((new Date() - new Date(isoString)) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
};

export function isDeviceOnline(data) {
    if (!data || !data.last_updated || !data.device_heartbeat) {
        return false;
    }
    const dataAge = (new Date() - new Date(data.last_updated)) / 1000;
    return dataAge < MAX_DATA_AGE_SECONDS;
};