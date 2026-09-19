const mqtt = require('mqtt');

const TOPIC  = 'wled/demo/api';
const BROKER = 'mqtt://broker.emqx.io';

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  if (params.token !== process.env.TRIGGER_SECRET) {
    return { statusCode: 401, body: 'unauthorized' };
  }

  const preset  = parseInt(params.preset, 10) || 16;
  const payload = `PL=${preset}`;

  return new Promise((resolve) => {
    const client  = mqtt.connect(BROKER, { port: 1883, connectTimeout: 6000 });
    const cleanup = (code, body) => { client.end(true); resolve({ statusCode: code, body }); };
    const timer   = setTimeout(() => cleanup(504, 'timeout'), 8000);

    client.on('connect', () => {
      client.publish(TOPIC, payload, { qos: 0 }, (err) => {
        clearTimeout(timer);
        cleanup(err ? 500 : 200, err ? 'publish failed' : 'ok');
      });
    });

    client.on('error', () => { clearTimeout(timer); cleanup(500, 'connection failed'); });
  });
};
