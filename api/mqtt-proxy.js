// File: /api/mqtt-proxy.js

import mqtt from 'mqtt';

// These environment variables MUST be set in your Vercel project settings
const MQTT_BROKER_HOST = 'io.adafruit.com';
const MQTT_BROKER_PORT = '8883'; // Secure MQTT port
const ADAFRUIT_IO_USERNAME = process.env.ADAFRUIT_IO_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_IO_KEY;

/**
 * Main handler for all incoming requests.
 */
export default async function handler(request, response) {
  // 1. Basic validation
  if (request.method !== 'POST') {
    return response.status(405).json({ status: 'error', details: 'Method Not Allowed' });
  }
  if (!ADAFRUIT_IO_USERNAME || !ADAFRUIT_IO_KEY) {
    return response.status(500).json({ status: 'error', details: 'MQTT credentials are not configured on the server.' });
  }

  const { action, topic } = request.body;

  // 2. Route request based on the "action" field
  try {
    if (action === 'publish') {
      await handlePublish(topic, request.body.payload);
      return response.status(200).json({ status: 'success', details: 'Message published.' });

    } else if (action === 'get_status') {
      const data = await handleGetStatus(topic);
      if (data) {
        return response.status(200).json({ status: 'success', data });
      } else {
        return response.status(404).json({ status: 'error', details: 'Status not found. Device may be offline.' });
      }
    } else {
      return response.status(400).json({ status: 'error', details: 'Invalid action.' });
    }
  } catch (error) {
    console.error('Proxy Error:', error.message);
    return response.status(500).json({ status: 'error', details: error.message });
  }
}

/**
 * Publishes a message to an MQTT topic.
 * Connects, publishes, and immediately disconnects.
 */
function handlePublish(topic, payload) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(`mqtts://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`, {
      username: ADAFRUIT_IO_USERNAME,
      password: ADAFRUIT_IO_KEY,
      clientId: `vercel_proxy_pub_${Date.now()}`, // Unique client ID for publishing
    });

    client.on('connect', () => {
      client.publish(topic, payload, { retain: false }, (err) => {
        client.end(); // Disconnect after publishing
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
 * This is the most reliable method for a serverless environment.
 */
async function handleGetStatus(topic) {
  const feedKey = topic.split('/').pop();
  const apiUrl = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data/last`;

  const apiResponse = await fetch(apiUrl, {
    headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
  });

  if (!apiResponse.ok) {
    // This happens if the feed has never received data.
    if (apiResponse.status === 404) return null;
    throw new Error(`Adafruit API request failed with status ${apiResponse.status}`);
  }

  const data = await apiResponse.json();
  
  // The ESP32 sends the status as a JSON string, so we must parse it here.
  return data && data.value ? JSON.parse(data.value) : null;
}