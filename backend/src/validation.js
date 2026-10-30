import { z } from "zod";

/*
 * Input rules shared by every form the API accepts.
 *
 * About "SQL injection": this app has no SQL. Firestore is only ever called
 * through its SDK with values as data (never building query text from input),
 * so there is nothing to inject into. The real risks are:
 *  - objects where strings are expected ({ "$gt": "" } style NoSQL tricks)
 *    -> every field is checked to be the right type, unknown fields dropped
 *  - HTML / script being stored and later shown somewhere (XSS)
 *    -> anything that looks like a tag or a javascript: link is rejected, and
 *       React escapes all text when it renders as a second layer
 *  - invisible / control characters used to spoof text or break emails
 *    -> stripped
 *  - ids containing "/" that would point at a different Firestore path
 *    -> ids must match a strict pattern
 */

// Control characters (keeps \n and \t), zero-width and bidi-override characters.
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤﻿]/g;
// "<b", "</div", "<!--", "<?php", "< script" ... but not "a < b" or "I <3 this".
const HTML_TAG = /<\s*[/!?]?\s*[a-z]|<!--/i;
const SCRIPT_URL = /(?:javascript|vbscript|livescript)\s*:/i;
const ENCODED_TAG = /&(?:lt|#0*60|#x0*3c);?\s*[/!?]?\s*[a-z]/i; // &lt;script, &#60;img

export const CODE_MESSAGE = "Please remove HTML or code from this field";

export function cleanText(value, { multiline = false } = {}) {
  let s = value.normalize("NFC").replace(INVISIBLE, "");
  s = multiline
    ? s.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n")
    : s.replace(/\s+/g, " ");
  return s.trim();
}

export const looksLikeCode = (s) =>
  HTML_TAG.test(s) || SCRIPT_URL.test(s) || ENCODED_TAG.test(s);

/**
 * A text field: must be a string, gets cleaned, length-checked, and rejected
 * if it contains markup or script links.
 */
export function safeText({ max, min = 0, multiline = false, required } = {}) {
  let inner = z.string();
  if (min > 0) inner = inner.min(min, required ?? "This field is required");
  inner = inner
    .max(max, `Please keep this under ${max} characters`)
    .refine((s) => !looksLikeCode(s), CODE_MESSAGE);
  return z
    .string({ error: "Must be text" })
    .max(max * 2 + 100, `Please keep this under ${max} characters`) // cheap cap before cleaning
    .transform((s) => cleanText(s, { multiline }))
    .pipe(inner);
}

export const email = z
  .string({ error: "Please enter a valid email" })
  .trim()
  .max(200)
  .pipe(z.email("Please enter a valid email"))
  .transform((s) => s.toLowerCase());

/** Prices in AUD, whole cents, or null for "price on enquiry". */
export const price = z
  .number({ error: "Price must be a number" })
  .finite()
  .nonnegative("Price can't be negative")
  .max(1_000_000, "That price looks too high")
  .transform((n) => Math.round(n * 100) / 100)
  .nullable();

export const year = z
  .string()
  .trim()
  .regex(/^(\d{4})?$/, "Use a 4-digit year, e.g. 2025");

/** Carrot Card season number, or null. */
export const season = z
  .number({ error: "Season must be a number" })
  .int("Season must be a whole number")
  .min(1)
  .max(50)
  .nullable();

export const COLLECTIONS = ["Original Paintings", "Carrot Cards"];
export const STATUSES = ["available", "reserved", "sold"];

/** Artwork ids are slugs (a-z, 0-9, dashes); Firestore auto ids are letters/digits. */
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

/** Express param guard: anything else is a 404 before it reaches Firestore. */
export function validId(_req, res, next, id) {
  if (!ID_PATTERN.test(id)) return res.status(404).json({ error: "Not found" });
  next();
}

/** Turns a zod error into { field: [messages] } for the form. */
export function fieldErrors(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export function slugify(title) {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artwork"
  );
}
