/**
 * Reading API responses that are not JSON.
 *
 * This exists because of a real incident: a new domain was not in the
 * server's CLIENT_ORIGIN allow-list, the CORS middleware threw, Express
 * rendered an HTML 500, and every net client parsed the body before checking
 * the status — so the user was shown
 * `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, which describes
 * the parser rather than the fault. The rule under test is: a non-JSON body
 * is a FAILURE with a legible reason, never a SyntaxError thrown at a caller.
 */
import { describe, expect, it } from 'vitest';
import { readApiJson } from '../apiResponse';

const respond = (body: string, status = 200) => new Response(body, { status });

describe('readApiJson', () => {
  it('parses a JSON body', async () => {
    const { body, nonJsonReason } = await readApiJson(respond('{"token":"abc"}'));
    expect(body).toEqual({ token: 'abc' });
    expect(nonJsonReason).toBeNull();
  });

  it('treats an empty body as legitimately empty, not as a failure', async () => {
    // 200 rather than 204: the fetch spec forbids a body on a 204, so
    // constructing one here throws in the test rather than in the code.
    const { body, nonJsonReason } = await readApiJson(respond('', 200));
    expect(body).toEqual({});
    expect(nonJsonReason).toBeNull();
  });

  it('reports an HTML error page as a failure, and says what to check', async () => {
    const { body, nonJsonReason } = await readApiJson(
      respond('<!DOCTYPE html>\n<html><body>Internal Server Error</body></html>', 500),
    );
    expect(body).toEqual({});
    expect(nonJsonReason).toContain('500');
    // The two things that actually cause this. Naming them is the point.
    expect(nonJsonReason).toMatch(/API URL/i);
    expect(nonJsonReason).toMatch(/allowed origins/i);
    // And never the parser's own vocabulary, which is what this replaces.
    expect(nonJsonReason).not.toMatch(/unexpected token/i);
  });

  it('catches an HTML page served with a 200, which a status check alone would miss', async () => {
    // An SPA catch-all rewrite answers 200 with index.html. Parsing on would
    // fail later and further from the cause.
    const { nonJsonReason } = await readApiJson(respond('<html><head><title>App</title></head></html>', 200));
    expect(nonJsonReason).not.toBeNull();
  });

  it('quotes a short non-JSON body but truncates a long one', async () => {
    const short = await readApiJson(respond('upstream connect error', 502));
    expect(short.nonJsonReason).toContain('upstream connect error');

    const long = await readApiJson(respond('x'.repeat(500), 502));
    expect(long.nonJsonReason).toContain('…');
    expect(long.nonJsonReason!.length).toBeLessThan(200);
  });

  it('never throws, whatever the body', async () => {
    for (const body of ['<', '{', 'null-ish', ' ', '[1,2']) {
      await expect(readApiJson(respond(body, 500))).resolves.toBeTruthy();
    }
  });
});
