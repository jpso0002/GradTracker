# Demo inbox guide — the live Refresh

*For the 20 October 2026 presentation. Decision D36.*

During the presentation a teammate sends a pre-written email to a throwaway Gmail account,
the presenter presses **Refresh**, and the dashboard changes. This page covers setting up
that account, the two emails, and what to do on the day.

**What is real and what is scripted.** The inbox, reading the mail, and everything the
pipeline does with it are real: the confidence gate, matching to the existing application,
the stage engine and provenance. **The classification is scripted**: no model is
called. The two emails below are recognised by their subject and given the answer prompt v2
asks a model for. Say so if asked. Anything else that arrives goes to review at low
confidence rather than onto the dashboard.

---

## 1. Set up the demo inbox (once, about 10 minutes)

1. **Create a new Gmail account** just for the demo. Never use a member's own account: the
   app reads everything that arrives.
2. **Turn on 2-Step Verification** for it (Google Account → Security). App passwords
   require it.
3. **Create an app password**: Google Account → Security → 2-Step Verification → App
   passwords (or go to `myaccount.google.com/apppasswords`). Name it "GradTracker demo".
   Google shows 16 letters once; copy them.
4. **Check IMAP is on**: Gmail → Settings → See all settings → Forwarding and POP/IMAP. If
   there is an IMAP setting, enable it.
5. **Add two lines to `.env`** on the presenting laptop (the file is gitignored; type the
   values yourself, and never paste them into chat or a commit):

   ```
   GMAIL_DEMO_USER=the-demo-address@gmail.com
   GMAIL_DEMO_APP_PASSWORD=the sixteen letters
   ```

   Spaces in the app password are fine.

After the semester, revoke the app password from the same page.

## 2. Start the demo

Two terminals, in the repository folder:

```
npm.cmd run demo
```

```
npm.cmd run dev:client
```

The first one should print `Refresh reads the-demo-address@gmail.com — mail received after
<time> only.` If it says *no demo inbox configured*, the `.env` lines are missing.

Open `http://localhost:5173`.

**Only mail received after `npm run demo` started counts.** Restarting rebuilds the
database and resets that time, so after a restart, send the emails again.

## 3. The two emails

Send them **from a teammate's own account** (phone is fine) **to the demo address**. Mail the
demo inbox sends to itself is skipped. Save both as drafts beforehand so they can be sent
with one tap. Copy the subject exactly; the body can be pasted as is.

### Email 1 — the application update

**Subject:** `Interview invitation — Deloitte Audit Graduate Program`

```
Hi Sam,

Thank you for completing the online assessment for the Audit Graduate Program at Deloitte.

We'd like to invite you to a first-round interview. Please book a time within 3 days using the link below.

Book your interview: https://example.com/deloitte/interview

Regards,
Deloitte Early Careers
```

**What the room sees:** the Deloitte · Audit Graduate Program card moves from *Assessment*
(overdue) to *Interview*, with a new deadline (23:59 on the third day) and the next action
"Book interview time".

### Email 2 — the unclear one

**Subject:** `Quick question about your application`

```
Hi Sam,

Thanks for your interest in joining us. Before we go any further, could you let me know whether you're still available to start in February?

Cheers,
Mia
Kestrel Partners
```

**What the room sees:** nothing new on the dashboard. **Needs review** goes from 4 to 5, and
the review queue has a Kestrel Partners card with no role, at 47% confidence. The model
was not sure enough, so the student is asked.

## 4. On the day

1. Start both terminals before the presentation; leave them running.
2. When it is time, the teammate sends Email 1 (and Email 2), then says "sent".
3. Wait a few seconds; Gmail can take 5–30 seconds to deliver. Press **Refresh**. The toast
   says what happened, e.g. *"2 new emails — 1 application updated, 1 to review"*.
4. *"No new emails"* means it has not arrived yet. Wait ten seconds and press again.
5. **If anything fails** (the toast says it could not sign in, the Wi-Fi is down, or the
   email never comes), press **Ctrl+Alt+R** on the dashboard. It feeds the same two emails
   through the same pipeline and looks identical. It works once; pressing it again changes
   nothing.

Press Refresh again afterwards and nothing changes: the same email is never processed twice.

## 5. Rehearse it

Do the full sequence at least once on the presenting laptop, on the venue's network if
possible:

```
npm.cmd run demo
```

Then send Email 1, press Refresh, and check the Deloitte card. Restart `npm run demo` to
reset everything before the real run.
