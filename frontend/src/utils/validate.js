// Same checks the API makes, run in the browser too so people get instant
// feedback. The API is still the real gatekeeper.

const HTML_TAG = /<\s*[/!?]?\s*[a-z]|<!--/i;
const SCRIPT_URL = /(?:javascript|vbscript|livescript)\s*:/i;
const ENCODED_TAG = /&(?:lt|#0*60|#x0*3c);?\s*[/!?]?\s*[a-z]/i;

export const CODE_MESSAGE = "Please remove HTML or code from this field";

export const looksLikeCode = (s = "") =>
  HTML_TAG.test(s) || SCRIPT_URL.test(s) || ENCODED_TAG.test(s);

/** Returns { field: [message] } for text fields containing code. */
export function codeErrors(values, keys) {
  const errors = {};
  for (const key of keys) {
    if (typeof values[key] === "string" && looksLikeCode(values[key])) errors[key] = [CODE_MESSAGE];
  }
  return errors;
}
