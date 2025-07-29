// File: /api/mqtt-proxy.js

import mqtt from 'mqtt';

// These environment variables MUST be set in your Vercel project settings
const {
  ADAFRUIT_IO_USERNAME,
  ADAFRUIT_IO_KEY
} = process.env;

const MQTT_BROKER_URL = 'mqtts://io.adafruit.com:8883'; // Secure MQTT URL

/**
 * Main handler for all incoming API requests.
 * It acts as a secure proxy between the frontend and the MQTT broker.
 */
export default async function handler(request, response) {
  // 1. Validate environment and request method
  if (request.method !== 'POST') {
    return response.status(405).json({ status: 'error', details: 'Method Not Allowed' });
  }
  if (!ADAFRUIT_IO_USERNAME || !ADAFRUIT_IO_KEY) {
    console.error('Server configuration error: Adafruit IO credentials are not set.');
    return response.status(500).json({ status: 'error', details: 'MQTT credentials are not configured on the server.' });
  }

  const { action, topic, payload } = request.body;

  // 2. Route the request based on the 'action'
  try {
    switch (action) {
      case 'publish':
        if (!topic || payload === undefined) {
          return response.status(400).json({ status: 'error', details: 'Missing topic or payload for publish action.' });
        }
        await handlePublish(topic, payload.toString());
        return response.status(200).json({ status: 'success', details: 'Message published.' });

      case 'get_status':
        if (!topic) {
          return response.status(400).json({ status: 'error', details: 'Missing topic for get_status action.' });
        }
        const data = await handleGetStatus(topic);
        if (data) {
          return response.status(200).json({ status: 'success', data });
        } else {
          return response.status(404).json({ status: 'error', details: 'Status not found. The device may be offline or has not published data yet.' });
        }

      default:
        return response.status(400).json({ status: 'error', details: 'Invalid action specified.' });
    }
  } catch (error) {
    console.error(`[MQTT Proxy Error] Action: ${action}, Topic: ${topic}, Error: ${error.message}`);
    return response.status(500).json({ status: 'error', details: error.message || 'An internal server error occurred.' });
  }
}

/**
 * Publishes a message to an MQTT topic. This is for sending commands.
 * It connects, publishes, and immediately disconnects (stateless).
 */
function handlePublish(topic, payload) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: ADAFRUIT_IO_USERNAME,
      password: ADAFRUIT_IO_KEY,
      clientId: `vercel_proxy_pub_${Date.now()}`,
      reconnectPeriod: 0 // Don't try to reconnect, it's a one-shot publish
    });

    client.on('connect', () => {
      console.log(`Proxy publishing to ${topic}`);
      client.publish(topic, payload, { retain: false }, (err) => {
        client.end(); // Disconnect immediately
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
 * Fetches the last value of a feed using the Adafruit IO REST API.
 * This is the most reliable method for getting status in a serverless environment,
 * as it retrieves the last message the broker retained for the topic.
 */
async function handleGetStatus(topic) {
  const feedKey = topic.split('/').pop();
  const apiUrl = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data/last`;
  
  console.log(`Proxy fetching status from Adafruit REST API for feed: ${feedKey}`);
  
  const apiResponse = await fetch(apiUrl, {
    headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
  });

  if (!apiResponse.ok) {
    // This typically happens if the feed has never received any data.
    if (apiResponse.status === 404) {
      console.warn(`No data found for feed ${feedKey} (404).`);
      return null;
    }
    throw new Error(`Adafruit API request failed with status ${apiResponse.statusText}`);
  }

  const data = await apiResponse.json();
  
  // The ESP32 sends the status as a JSON string, so we must parse it here.
  return data && data.value ? JSON.parse(data.value) : null;
}