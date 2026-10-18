import { createDemoInbox } from "./adapters/index.js";
import { loadCorpus } from "./corpus/loader.js";
import { buildSampleMessage } from "./demo.js";

/**
 * Places the 80 sample emails in the demo inbox (D37).
 *
 *   npm run demo:load-inbox
 *
 * Over IMAP, as messages appended to the inbox — **nothing is sent**, so each
 * keeps its own sender and date, and no spam filter sees them. Each carries a
 * Message-ID marking it as a sample. Run it again and it adds only what is
 * missing; it never deletes anything.
 *
 * Only for the throwaway demo inbox in `.env`, never a member's own account.
 */

const inbox = createDemoInbox();
const address = process.env["GMAIL_DEMO_USER"]?.trim();

if (!inbox || !address) {
  console.error("No demo inbox configured. Set GMAIL_DEMO_USER and GMAIL_DEMO_APP_PASSWORD in .env first.");
  process.exit(1);
}

try {
  const fixtures = loadCorpus();
  const present = await inbox.listSampleIds();
  const missing = fixtures.filter((f) => !present.has(f.email.gmailMessageId));

  await inbox.appendSamples(missing.map((f) => buildSampleMessage(f, address)));

  console.log(
    `Placed ${missing.length} sample emails in ${address}` +
      (present.size > 0 ? ` (${present.size} were already there)` : "") +
      ". Nothing was sent.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
