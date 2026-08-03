/**
 * Public, unauthenticated read of the active cosmetic-accessory catalog
 * (sleeves + DON!! arts) — consumed by the player-facing Accessories screen
 * (src/app/screens/AccessoriesScreen.tsx via multiplayer/net/accessoryClient.ts).
 * No auth: this is display content, not account data. Mounted at
 * GET /accessories in server/src/index.ts.
 */
import { Router, type Request, type Response } from 'express';
import { AccessoryService } from './accessoryService';

const service = new AccessoryService();

export function accessoriesPublicRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      res.json({ accessories: await service.listActiveForPlayers() });
    } catch (cause) {
      console.error('[accessories] failed to list catalog:', cause);
      res.status(500).json({ error: 'Could not load accessories.', code: 'INTERNAL' });
    }
  });

  return router;
}
