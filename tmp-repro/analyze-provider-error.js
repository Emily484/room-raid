import { createApp } from '../server/app.js';

// Mock observer that throws an error from provider
const mockObserver = {
  model: 'mock-error',
  async analyzeScan() {
    throw new Error('simulated provider network failure');
  }
};

const app = createApp({ visionObserver: mockObserver });
const port = 4002;

const srv = app.listen(port, async () => {
  console.log(`Test server listening on ${port}`);
  try {
    const resCreate = await fetch(`http://localhost:${port}/api/scans`, { method: 'POST' });
    const scan = await resCreate.json();
    console.log('created scan', scan.id);

    const res = await fetch(`http://localhost:${port}/api/scans/${scan.id}/analyze`, { method: 'POST' });
    const text = await res.text();
    console.log('analyze status', res.status, 'body:', text);
  } catch (e) {
    console.error('client error', e);
  } finally {
    srv.close();
  }
});
