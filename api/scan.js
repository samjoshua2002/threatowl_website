// Serverless entry for the scanner (Vercel / Netlify-style Node handler). Deploy this alongside the static build.
import { handle } from '../server/scan.js';
export default handle;
