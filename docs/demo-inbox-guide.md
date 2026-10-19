# Demo inbox guide — the opening scan and the live Refresh

*For the 20 October 2026 presentation. Decisions D36 and D37.*

The demo reads a throwaway Gmail account twice:

1. **At sign-in.** The walkthrough's scan reads the 80 sample emails loaded into the inbox
   and builds the dashboard from them.
2. **During the presentation.** A teammate sends a pre-written email, the presenter presses
   **Refresh**, and the dashboard changes.

This page covers setting up the account, loading the samples, the two live emails, and the day itself.

**What is real and what is scripted.** These parts are real: the inbox, reading the mail
over IMAP, and everything the pipeline does with each email (the confidence gate, matching
to an existing application, the stage engine and provenance). **The classification is not
a model.** The sample emails are classified from their labels, and the two live emails are
recognised by their subject and given the answer prompt v2 asks a model for. The scan
screen says so, and you should too if asked. Anything unrecognised that arrives goes to
review at low confidence rather than onto the dashboard.

---

## 1. Set up the demo inbox (once, about 10 minutes)

1. **Create a new Gmail account** just for the demo. Never use a member's own account: the
   app reads everything that arrives.
2. **Turn on 2-Step Verification** for it (Google Account → Security). App passwords
   require it.
3. **Create an app password** at `myaccount.google.com/apppasswords`. Name it "GradTracker
   demo". Google shows 16 letters once; copy them.
4. **IMAP** needs no change. Gmail no longer has a switch for it.
5. **Add two lines to `.env`** on the presenting laptop (the file is gitignored; type the
   values yourself, and never paste them into chat or a commit):

   ```
   GMAIL_DEMO_USER=the-demo-address@gmail.com
   GMAIL_DEMO_APP_PASSWORD=the sixteen letters
   ```

   Spaces in the app password are fine.

After the semester, revoke the app password from the same page.

## 2. Load the 80 sample emails (once — or again after D42)

**If the inbox already holds the older sample emails** (loaded before 19 October), delete them in
Gmail first: select all → Delete, then empty the Bin. The new versions have the same
Message-IDs, so the load script would otherwise think they are already there and add nothing.

```
npm.cmd run demo:load-inbox
```

This places the sample emails from `fixtures/emails/` in the inbox, each with its own
sender (Greenhouse, LinkedIn, Deloitte…) and original date. **Nothing is sent**: they're
added straight into the inbox, already marked as read. It should print `Placed 80 sample
emails in …`. Running it again adds only what's missing and never deletes anything.

They are dated **28 September – 19 October 2026** (D42), and every date written inside them
matches, so an email opened from the app reads the same as the dashboard. On presentation day
(20 October) the app shows them exactly as dated; on any other day it moves them by the same
number of days so the newest arrived yesterday.

## 3. Start the demo

Two terminals, in the repository folder:

```
npm.cmd run demo
```

```
npm.cmd run dev:client
```

The first should print `Only gradtrackerdemo@gmail.com can connect the demo inbox …`. If it
says *no demo inbox configured*, the `.env` lines are missing.

### Accounts (D40), set up once, before the presentation

The demo has real accounts: **Create your account**, **Sign in**, and **Sign out** (Settings →
Account). They're kept in `demo-accounts.json` next to `demo.db`, never committed. Each one
stores a salted hash, never the password, and each account has its own dashboard.

1. Open `http://localhost:5173`. You start on **Create your account**.
2. Create the demo inbox's account: any name, **email `gradtrackerdemo@gmail.com`**, and a
   password you choose (8+ characters). Remember it, since you'll type it during the demo.
3. That account's first sign-in goes to **Connect your Gmail → Continue with Google →
   Allow**, then the scan: about 7 seconds, 80 emails read, 25 ignored, **20 applications** —
   17 live (2 applied, 3 assessments, 10 interviews, 2 offers), 3 rejected in Archived, PwC's
   assessment the one overdue item — and **4 to review**: Xero and SEEK (the "model" unsure),
   an unclear Atlassian match, and IBM's withdrawal, which only you can apply (confirm it live
   to show the withdrawn stage). If the inbox can't be read, the scan uses the seeded sample
   mailbox, and a toast says why.
4. After that, signing in as this account goes straight to its dashboard.

Accounts and dashboards survive restarts. **Settings → Reset demo** empties the signed-in
account's dashboard; for the demo inbox's account that means its next visit scans again. Only
mail sent after the latest scan counts for Refresh, so send the live emails again after a reset.

**To rehearse the start of the demo again**, sign in as the demo account and press Reset demo.
The random accounts you create while rehearsing can stay, since they don't affect anything; to
remove them all, stop the server and delete `demo-accounts.json`. That also deletes the demo
account, so create it again.

### The demo, in order

1. **Create your account** with a made-up name and email: it lands on an **empty dashboard**
   ("only the demo inbox's own account can connect Gmail").
2. **Settings → Sign out**.
3. **Sign in** as `gradtrackerdemo@gmail.com`: its dashboard, read from the inbox (or, the
   first time, Connect → Allow → scan).
4. Carry on: Refresh with the live emails, Needs review, and so on.

## 4. The two live emails

Send them **from a teammate's own account** (phone is fine) **to the demo address**. Mail the
demo inbox sends to itself is skipped. Save both as drafts beforehand so each can be sent
with one tap. Copy the subject exactly; the body can be pasted as is.

### Email 1 — the application update

**Subject:** `Interview invitation — Accenture Technology Graduate`

```
Dear Sam,

Thank you for completing the digital assessment for the Technology Graduate role at Accenture.

We'd like to invite you to an interview. Please book a time within 3 days using the link below.

Book your interview: https://example.com/accenture/interview

Accenture Recruitment
```

**What the room sees:** the Accenture · Technology Graduate card moves from *Assessment* to
*Interview*, with a deadline (23:59 on the third day) and the next action "Book interview
time".

### Email 2 — the unclear one

**Subject:** `Quick question about your application`

```
Hi Sam,

Thanks for your interest in joining us. Before we go any further, could you let me know whether you're still available to start in February?

Cheers,
Mia
Kestrel Partners
```

**What the room sees:** nothing new on the dashboard. **Needs review** goes up by one,
with a Kestrel Partners card with no role at 47% confidence. The model wasn't sure enough,
so the student is asked.

## Opening an email in Gmail

In the application panel's timeline and on each **Needs review** card, **Open in Gmail** opens
that exact email in the demo inbox, in a new tab. For that, the presenting browser must be
signed in to the demo account (it can sit alongside your own). The seeded fallback mailbox
has no real emails, so its items show no link.

## 5. On the day

1. Start both terminals before the presentation and leave them running. Go through the
   sign-in live: that's the scan.
2. When it's time, the teammate sends Email 1 (and Email 2), then says "sent".
3. Wait a few seconds, since Gmail can take 5–30 seconds to deliver. Press **Refresh**. The
   toast says what happened, e.g. *"2 new emails — 1 application updated, 1 to review"*.
4. *"No new emails"* means it hasn't arrived yet. Wait ten seconds and press again.
5. **If anything fails** (the toast says it couldn't sign in, the Wi-Fi is down, or the
   email never arrives), press **Ctrl+Alt+R** on the dashboard. It feeds the same two emails
   through the same pipeline and looks identical. It works once; pressing it again changes
   nothing.

Press Refresh again afterwards and nothing changes: the same email is never processed twice.

## 6. Rehearse it

Do the full sequence at least once on the presenting laptop, ideally on the venue's network:
sign in (the scan), send Email 1, press Refresh, and check the Accenture card. Then press
**Settings → Reset demo** to put everything back before the real run.
