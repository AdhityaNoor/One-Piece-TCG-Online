/**
 * Account-backed deck library REST surface. Every route requires auth
 * (matches profile/routes.ts + ranked/routes.ts's pattern) — decks belong to
 * a signed-in account, never to an anonymous session.
 *
 * This is intentionally a thin sync surface, not a full deck-builder backend:
 * the client keeps its existing localStorage DeckStore as the fast,
 * synchronous, offline-capable source of truth (src/cards/decks/deckStorage.ts)
 * and this router is what src/app/lib/deckSync.ts talks to in the background
 * to push local saves/deletes up and pull remote decks down on login — see
 * that file's doc comment for why the sync is push/pull rather than making
 * every deck read/write in the app async.
 */
import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../auth/middleware';
import { DeckService } from './deckService';
import { sendDeckError } from './errors';

const decks = new DeckService();

function userId(req: Request): string {
  return req.auth!.sub;
}

async function handle(res: Response, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (cause) {
    sendDeckError(res, cause);
  }
}

export function decksRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    await handle(res, async () => {
      const list = await decks.list(userId(req));
      res.json({ decks: list });
    });
  });

  router.get('/:deckId', async (req, res) => {
    await handle(res, async () => {
      const deck = await decks.get(userId(req), req.params.deckId);
      res.json({ deck });
    });
  });

  router.put('/:deckId', async (req, res) => {
    await handle(res, async () => {
      const body = req.body as { deck?: unknown } | undefined;
      const deck = await decks.save(userId(req), req.params.deckId, body?.deck);
      res.json({ deck });
    });
  });

  router.delete('/:deckId', async (req, res) => {
    await handle(res, async () => {
      await decks.remove(userId(req), req.params.deckId);
      res.status(204).end();
    });
  });

  return router;
}
