import fetch from 'node-fetch';

const SERVER_URL = process.env.SERVER_URL;
if (!SERVER_URL) {
  throw new Error('SERVER_URL is not defined in environment variables.');
}

async function pingServer() {
  try {
    const res = await fetch(SERVER_URL as string);
    if (res.ok) {
      console.log(`Ping successful: ${res.status}`);
    } else {
      console.error(`Ping failed: ${res.status}`);
    }
  } catch (err) {
    console.error('Ping error:', err);
  }
}

pingServer();
