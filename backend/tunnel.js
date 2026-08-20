const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 5000, subdomain: 'rossomandi-api' });
    console.log('--- LOCAL TUNNEL ACTIVE ---');
    console.log('URL:', tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      try { tunnel.close(); } catch(e) {}
    });
  } catch (err) {
    console.error('Tunnel start error:', err.message, 'Retrying in 5 seconds...');
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
