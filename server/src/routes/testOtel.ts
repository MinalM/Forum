import express from 'express';
import { testOtelIntegration } from '../controllers/testOtel';

const router = express.Router();

// Test endpoint - no authentication required for easy testing
router.get('/otel', testOtelIntegration);

export default router;
