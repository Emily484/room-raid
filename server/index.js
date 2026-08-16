import createApp from './app.js';
import "dotenv/config";

const PORT = process.env.PORT || 3001;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Room Raid API listening on http://localhost:${PORT}`);
});
