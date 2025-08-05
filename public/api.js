const MQTT_PROXY_ENDPOINT = "/api/mqtt-proxy";

async function fetchAPI(body) {
    const response = await fetch(MQTT_PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: `HTTP Error: ${response.status}` }));
        throw new Error(errorData.details || 'An unknown API error occurred.');
    }

    return response.json();
}

export function getSystemStatus() {
    return fetchAPI({ action: 'get_system_status' });
}

export function sendMotorCommand(command) {
    // Simple validation
    if (command !== 'on' && command !== 'off') {
        throw new Error('Invalid command specified.');
    }
    return fetchAPI({ action: 'send_motor_command', payload: command });
}