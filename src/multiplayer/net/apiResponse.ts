/**
 * Reading a JSON API response without turning an infrastructure failure into
 * a parse error.
 *
 * WHY THIS EXISTS: every net client used to do
 *
 *     const body = text ? JSON.parse(text) : {};
 *     if (!res.ok) throw new XApiError(body.error ?? `Request failed (${res.status})`);
 *
 * which parses BEFORE checking the status. That is fine while the server
 * answers in JSON, and actively misleading the moment something between the
 * browser and the route handler answers instead — a proxy, a CDN, a rewrite,
 * or the server's own default error page. Those all answer in HTML, so
 * `JSON.parse` throws first and the status check never runs. The user is then
 * shown a raw SyntaxError:
 *
 *     Unexpected token '<', "<!DOCTYPE "... is not valid JSON
 *
 * That message describes the parser's disappointment, not the failure, and it
 * costs real time to trace back to (in this project: a CORS rejection that
 * Express rendered as a 500 HTML page). Checking the status FIRST and naming
 * the shape of a non-JSON body turns the same event into a sentence that
 * points at the actual problem.
 */

export interface ParsedApiResponse {
  /** The parsed JSON body, or `{}` when the body was empty or not JSON. */
  body: unknown;
  /**
   * Null when the body was JSON (or legitimately empty). Otherwise a
   * human-readable description of what came back instead, suitable for
   * showing to a user and for reading in a bug report.
   */
  nonJsonReason: string | null;
}

/** Enough of the body to recognise it, without pasting a whole HTML page into an error. */
function snippet(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > 80 ? `${collapsed.slice(0, 80)}…` : collapsed;
}

function describe(res: Response, text: string): string {
  const looksLikeHtml = /^\s*(<!doctype|<html)/i.test(text);
  if (looksLikeHtml) {
    // The overwhelmingly common case, and the one worth spelling out: the
    // request did not reach a JSON route. Naming both usual suspects saves
    // the next person the trace we just did.
    return `The server returned a web page instead of data (HTTP ${res.status}). The request probably never reached the API — check the API URL, and that this site's address is in the server's allowed origins.`;
  }
  if (!text.trim()) return `The server returned an empty response (HTTP ${res.status}).`;
  return `The server returned an unreadable response (HTTP ${res.status}): ${snippet(text)}`;
}

/**
 * Reads `res` as JSON, never throwing a SyntaxError at the caller.
 *
 * Callers should treat a non-null `nonJsonReason` as a failure even when
 * `res.ok` is true: a 200 carrying HTML is not a successful API call, it is a
 * rewrite or a captive portal, and parsing on would fail later and further
 * from the cause.
 */
export async function readApiJson(res: Response): Promise<ParsedApiResponse> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    // A body that cannot even be read (aborted, network cut mid-response).
    return { body: {}, nonJsonReason: `The connection dropped before the server finished responding (HTTP ${res.status}).` };
  }

  if (!text) return { body: {}, nonJsonReason: null };

  try {
    return { body: JSON.parse(text) as unknown, nonJsonReason: null };
  } catch {
    return { body: {}, nonJsonReason: describe(res, text) };
  }
}
