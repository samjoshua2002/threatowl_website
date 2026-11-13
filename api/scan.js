// Vercel serverless function: GET /api/scan?host=example.com (the scanner's web checks). See server/scan.js.
import { handle } from '../server/scan.js';
export default handle;
