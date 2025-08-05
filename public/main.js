import { ui, updateUI, showToast, createBubbles } from './ui.js';
import { getSystemStatus, sendMotorCommand } from './api.js';
import { state, setState, setCommandPending } from './state.js';

const STATUS_REFRESH_INTERVAL = 3000; // 3 seconds
let statusIntervalId = null;

async function handleCommand(command) {
    clearInterval(statusIntervalId); // Pause polling
    setCommandPending(true);
    updateUI(); // Reflect pending state immediately

    try {
        await sendMotorCommand(command);
        showToast(`Manual ${command.toUpperCase()} command sent.`, 'success');
        setTimeout(fetchAndUpdateStatus, 500); // Fetch status quickly after command
    } catch (error) {
        showToast(`Command failed: ${error.message}`, 'error');
        setCommandPending(false); // Revert pending state on error
        updateUI();
    } finally {
        // Resume polling after a short delay
        statusIntervalId = setInterval(fetchAndUpdateStatus, STATUS_REFRESH_INTERVAL);
    }
}

async function fetchAndUpdateStatus() {
    try {
        const result = await getSystemStatus();
        setState({
            motor: result.data.motor,
            water: result.data.water,
            isCommandPending: false
        });
    } catch (error) {
        console.error("Failed to get system status:", error.message);
        // Set state to null to show devices as offline
        setState({ motor: null, water: null, isCommandPending: false });
    }
    updateUI();
}

function init() {
    // Initial DOM element mapping in ui.js
    ui.init();
    createBubbles(5);

    // Setup event listeners
    ui.controlButtons.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
            handleCommand(e.target.dataset.command);
        }
    });

    // Initial fetch and start polling
    fetchAndUpdateStatus();
    statusIntervalId = setInterval(fetchAndUpdateStatus, STATUS_REFRESH_INTERVAL);
}

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', init);