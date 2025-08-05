import mqtt from 'mqtt';

<<<<<<< HEAD
// --- Environment Variables ---
// These MUST be set in your Vercel project settings.
=======
// These environment variables MUST be set in your Vercel project settings.
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST || 'io.adafruit.com';
const MQTT_BROKER_PORT = process.env.MQTT_BROKER_PORT || '1883';
const ADAFRUIT_IO_USERNAME = process.env.ADAFRUIT_IO_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_IO_KEY;

<<<<<<< HEAD
// --- MQTT Topics ---
=======
// Define topics for both devices
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
const TOPIC_MOTOR = `${ADAFRUIT_IO_USERNAME}/feeds/motor-control`;
const TOPIC_WATER = `${ADAFRUIT_IO_USERNAME}/feeds/water-level`;

/**
<<<<<<< HEAD
 * Main handler for all incoming Vercel serverless requests.
 */
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ details: 'Method Not Allowed' });
    }

    if (!ADAFRUIT_IO_USERNAME || !ADAFRUIT_IO_KEY) {
        return response.status(500).json({ details: 'MQTT credentials are not configured on the server.' });
=======
 * Main handler for all incoming requests.
 */
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ status: 'error', details: 'Method Not Allowed' });
    }
    if (!ADAFRUIT_IO_USERNAME || !ADAFRUIT_IO_KEY) {
        return response.status(500).json({ status: 'error', details: 'CRITICAL: MQTT credentials are not configured on the server.' });
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
    }

    const { action, payload } = request.body;

    try {
<<<<<<< HEAD
        switch (action) {
            case 'send_motor_command':
                // Validate payload to prevent publishing unwanted data
                if (payload !== 'on' && payload !== 'off') {
                    return response.status(400).json({ details: 'Invalid command payload.' });
                }
                await handlePublish(TOPIC_MOTOR, { command: payload });
                return response.status(200).json({ details: 'Command published successfully.' });

            case 'get_system_status':
                const data = await handleGetSystemStatus();
                return response.status(200).json({ data });

            default:
                return response.status(400).json({ details: 'Invalid action specified.' });
        }
    } catch (error) {
        console.error('[PROXY_ERROR]', error);
        return response.status(500).json({ details: error.message || 'An internal server error occurred.' });
=======
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
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
    }
}

/**
<<<<<<< HEAD
 * Publishes a JSON message to the specified MQTT topic.
 * @param {string} topic - The MQTT topic to publish to.
 * @param {object} payload - The JSON object to send.
 */
function handlePublish(topic, payload) {
=======
 * Publishes a command message to the specified MQTT topic.
 */
function handlePublish(topic, command) {
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
    return new Promise((resolve, reject) => {
        const client = mqtt.connect(`mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`, {
            username: ADAFRUIT_IO_USERNAME,
            password: ADAFRUIT_IO_KEY,
            clientId: `vercel_proxy_pub_${Date.now()}`,
<<<<<<< HEAD
            reconnectPeriod: 0, // Don't try to reconnect, fail fast.
        });

        client.on('connect', () => {
            client.publish(topic, JSON.stringify(payload), { retain: false }, (err) => {
                client.end(); // Close connection immediately
=======
            reconnectPeriod: 0,
        });

        client.on('connect', () => {
            const messagePayload = JSON.stringify({ command: command });
            client.publish(topic, messagePayload, { retain: false }, (err) => {
                client.end();
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
                if (err) return reject(new Error('Failed to publish message.'));
                resolve();
            });
        });

        client.on('error', (err) => {
            client.end();
<<<<<<< HEAD
            reject(new Error(`MQTT connection error: ${err.message}`));
=======
            reject(new Error(`MQTT connection failed: ${err.message}`));
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
        });
    });
}

/**
<<<<<<< HEAD
 * Fetches the last known data from both the motor and water feeds.
 */
async function handleGetSystemStatus() {
    const motorFeedKey = TOPIC_MOTOR.split('/').pop();
    const waterFeedKey = TOPIC_WATER.split('/').pop();

    // Use Promise.allSettled to ensure we get a result even if one feed fails
    const [motorResult, waterResult] = await Promise.allSettled([
        getFeedData(motorFeedKey),
        getFeedData(waterFeedKey)
    ]);

    // Return the value if fulfilled, otherwise null
    return {
        motor: motorResult.status === 'fulfilled' ? motorResult.value : null,
        water: waterResult.status === 'fulfilled' ? waterResult.value : null,
    };
}

/**
 * Fetches the last data point from a specific Adafruit IO feed.
 * @param {string} feedKey - The key of the feed to fetch.
 */
async function getFeedData(feedKey) {
    const apiUrl = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data/last`;
    const apiResponse = await fetch(apiUrl, {
        headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
    });

    if (!apiResponse.ok) {
        // 404 is a valid case if a feed has no data yet, return null.
        if (apiResponse.status === 404) return null;
        throw new Error(`Adafruit API request for '${feedKey}' failed with status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    if (!data || !data.value) return null;

    try {
        const parsedValue = JSON.parse(data.value);
        // Combine the parsed data with the timestamp from the API response
=======
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
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
        return {
            ...parsedValue,
            last_updated: data.created_at
        };
    } catch (e) {
<<<<<<< HEAD
        // If the data in the feed isn't valid JSON, we can't use it.
        throw new Error(`Malformed JSON received from feed '${feedKey}'.`);
    }
}
=======
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
>>>>>>> 2414cd53efd262d27cbe253db56400e99b08031c
