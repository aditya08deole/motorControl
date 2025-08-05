import { state } from './state.js';
import { isDeviceOnline, formatTimeAgo, formatSecondsToHMS } from './utils.js';

export const ui = {
    // This will be populated by init()
};

export function init() {
    ui.toast = document.getElementById('toast');
    ui.waterPanel = document.getElementById('waterPanel');
    ui.waterMonitorStatus = document.getElementById('waterMonitorStatus');
    ui.waterLevel = document.getElementById('waterLevel');
    ui.waterLevelPercent = document.getElementById('waterLevelPercent');
    ui.waterLevelStatus = document.getElementById('waterLevelStatus');
    ui.waterTempStatus = document.getElementById('waterTempStatus');
    ui.waterLastUpdate = document.getElementById('waterLastUpdate');
    ui.bubblesContainer = document.getElementById('bubblesContainer');
    ui.motorPanel = document.getElementById('motorPanel');
    ui.motorControllerStatus = document.getElementById('motorControllerStatus');
    ui.systemStatus = document.getElementById('systemStatus');
    ui.motorStatus = document.getElementById('motorStatus');
    ui.motorMode = document.getElementById('motorMode');
    ui.currentOnTime = document.getElementById('currentOnTime');
    ui.motorLastUpdate = document.getElementById('motorLastUpdate');
    ui.controlButtons = document.getElementById('controlButtons');
}

export function showToast(message, type = 'error') {
    ui.toast.textContent = message;
    ui.toast.className = `toast-notification ${type} show`;
    setTimeout(() => {
        ui.toast.className = 'toast-notification';
    }, 3000);
}

const updateDeviceStatusIndicator = (indicatorEl, isOnline) => {
    indicatorEl.textContent = isOnline ? 'Online' : 'Offline';
    indicatorEl.className = `device-status-indicator ${isOnline ? 'online' : 'offline'}`;
};

const updateWaterPanel = (isOnline) => {
    const data = state.water;
    const level = isOnline && data?.level_percent !== null ? data.level_percent : null;
    const temp = isOnline && data?.temperature_c !== null ? data.temperature_c.toFixed(1) : null;
    
    ui.waterLevel.style.height = level !== null ? `${level}%` : '0%';
    ui.waterLevelPercent.textContent = level !== null ? `${level}%` : 'N/A';
    ui.waterLevelStatus.textContent = level !== null ? `${level}%` : 'N/A';
    ui.waterTempStatus.textContent = temp !== null ? `${temp}°C` : 'N/A';
    ui.waterLastUpdate.textContent = isOnline && data ? formatTimeAgo(data.last_updated) : 'Never';
    
    const motorIsOn = isDeviceOnline(state.motor) && state.motor.motor_state === 'ON';
    ui.bubblesContainer.classList.toggle('active', motorIsOn);
};

const updateMotorPanel = (isOnline) => {
    const data = state.motor;
    const isLockout = isOnline && data?.sensor_lockout === true;
    const buttonsDisabled = !isOnline || isLockout || state.isCommandPending;

    ui.controlButtons.querySelectorAll('button').forEach(btn => btn.disabled = buttonsDisabled);

    if (isLockout) {
        ui.systemStatus.textContent = 'SENSOR LOCKOUT';
        ui.systemStatus.className = 'status-item__value status-lockout';
    } else {
        ui.systemStatus.textContent = isOnline ? 'Nominal' : '--';
        ui.systemStatus.className = `status-item__value ${isOnline ? 'status-on' : ''}`;
    }
    
    if (state.isCommandPending) {
        ui.motorStatus.textContent = 'Pending...';
        ui.motorStatus.className = 'status-item__value status-pending';
    } else {
        const motorState = isOnline && data?.motor_state ? data.motor_state : 'UNKNOWN';
        ui.motorStatus.textContent = motorState;
        ui.motorStatus.className = `status-item__value status-${motorState.toLowerCase()}`;
    }

    ui.motorMode.textContent = isOnline && data?.manual_override ? 'Manual' : (isOnline ? 'Auto' : '--');
    ui.currentOnTime.textContent = isOnline && data ? formatSecondsToHMS(data.current_on_time_s) : '--';
    ui.motorLastUpdate.textContent = isOnline && data ? formatTimeAgo(data.last_updated) : 'Never';
};

export function updateUI() {
    const motorOnline = isDeviceOnline(state.motor);
    const waterOnline = isDeviceOnline(state.water);

    updateDeviceStatusIndicator(ui.motorControllerStatus, motorOnline);
    updateDeviceStatusIndicator(ui.waterMonitorStatus, waterOnline);
    
    updateMotorPanel(motorOnline);
    updateWaterPanel(waterOnline);
}

export function createBubbles(count) {
    for(let i = 0; i < count; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.left = `${Math.random() * 90 + 5}%`;
        bubble.style.animationDuration = `${Math.random() * 5 + 8}s`;
        bubble.style.animationDelay = `${Math.random() * 5}s`;
        ui.bubblesContainer.appendChild(bubble);
    }
}