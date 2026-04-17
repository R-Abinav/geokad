import { Router } from 'express';

const router = Router();

// POST /api/trips/register
// Called when tourist successfully scans QR and starts trip
// Will be fully implemented in Phase 5 with Prisma + PostgreSQL
router.post('/register', async (req, res) => {
  const { tripId, userId, location, startedAt } = req.body;
  // TODO Phase 5: save to PostgreSQL via Prisma
  res.json({ success: true, tripId });
});

export default router;
