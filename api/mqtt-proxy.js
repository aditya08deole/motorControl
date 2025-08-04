import mqtt from 'mqtt';

// These environment variables MUST be set in your Vercel project settings.
const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST || 'io.adafruit.com';
const MQTT_BROKER_PORT = process.env.MQTT_BROKER_PORT || '1883';
const ADAFRUIT_IO_USERNAME = process.env.ADAFRUIT_IO_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_IO_KEY;

// Define topics for both devices
const TOPIC_MOTOR = `${ADAFRUIT_IO_USERNAME}/feeds/motor-control`;
const TOPIC_WATER = `${ADAFRUIT_IO_USERNAME}/feeds/water-level`;

/**
 * Main handler for all incoming requests.
 */
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ status: 'error', details: 'Method Not Allowed' });
    }
    if (!ADAFRUIT_IO_USERNAME || !ADAFRUIT_IO_KEY) {
        return response.status(500).json({ status: 'error', details: 'CRITICAL: MQTT credentials are not configured on the server.' });
    }

    const { action, payload } = request.body;

    try {
        if (action === 'send_motor_command') {
            await handlePublish(TOPIC_MOTOR, payload);
            return response.status(200).json({ status: 'success', details: 'Command published.' });

        } else if (action === 'get_system_status') {
            const data = await handleGetSystemStatus();
            return response.status(200).json({ status: 'success', data });

        } else {
            return response.status(400).json({ status: 'error', details: 'Invalid action specified.' });
        }
    } catch (error) {
        console.error('[PROXY_ERROR]', error.message);
        return response.status(500).json({ status: 'error', details: error.message });
    }
}

/**
 * Publishes a command message to the specified MQTT topic.
 */
function handlePublish(topic, command) {
    return new Promise((resolve, reject) => {
        const client = mqtt.connect(`mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`, {
            username: ADAFRUIT_IO_USERNAME,
            password: ADAFRUIT_IO_KEY,
            clientId: `vercel_proxy_pub_${Date.now()}`,
            reconnectPeriod: 0,
        });

        client.on('connect', () => {
            const messagePayload = JSON.stringify({ command: command });
            client.publish(topic, messagePayload, { retain: false }, (err) => {
                client.end();
                if (err) return reject(new Error('Failed to publish message.'));
                resolve();
            });
        });

        client.on('error', (err) => {
            client.end();
            reject(new Error(`MQTT connection failed: ${err.message}`));
        });
    });
}

/**
 * Fetches the last status message from a given Adafruit IO feed.
 */
async function getFeedData(feedKey) {
    const apiUrl = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data/last`;
    try {
        const apiResponse = await fetch(apiUrl, {
            headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
        });

        if (!apiResponse.ok) {
            if (apiResponse.status === 404) {
                return null;
            }
            throw new Error(`Adafruit API request for '${feedKey}' failed with status ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        if (!data || !data.value) return null;

        const parsedValue = JSON.parse(data.value);
        return {
            ...parsedValue,
            last_updated: data.created_at
        };
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new Error(`Malformed JSON from feed ${feedKey}.`);
        }
        throw e;
    }
}


/**
 * Fetches the status from both the motor and water level feeds and combines them.
 */
async function handleGetSystemStatus() {
    const motorFeedKey = TOPIC_MOTOR.split('/').pop();
    const waterFeedKey = TOPIC_WATER.split('/').pop();

    const [motorResult, waterResult] = await Promise.allSettled([
        getFeedData(motorFeedKey),
        getFeedData(waterFeedKey)
    ]);

    const motorData = motorResult.status === 'fulfilled' ? motorResult.value : null;
    const waterData = waterResult.status === 'fulfilled' ? waterResult.value : null;
    
    return {
        motor: motorData,
        water: waterData,
    };
}
