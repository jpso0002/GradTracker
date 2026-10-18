import { describe, it, expect } from "vitest";
import { gmailLink } from "./gmailLink";

/** Links to the email GradTracker read (D38): to the right email, in the right account. */
describe("gmailLink", () => {
  it("searches a Message-ID in the account it was read from", () => {
    expect(gmailLink("fixture-001@gradtracker.demo", "gradtrackerdemo@gmail.com")).toBe(
      "https://mail.google.com/mail/?authuser=gradtrackerdemo%40gmail.com#search/rfc822msgid%3Afixture-001%40gradtracker.demo",
    );
  });

  it("opens a Gmail API id directly", () => {
    expect(gmailLink("18f2a3b4c5d6e7f8", null)).toBe("https://mail.google.com/mail/u/0/#all/18f2a3b4c5d6e7f8");
  });

  it("gives no link for an id that names no email — seeded, backup or authored (C10)", () => {
    expect(gmailLink("seed-1b2c", "gradtrackerdemo@gmail.com")).toBeNull();
    expect(gmailLink("backup-accenture-interview", null)).toBeNull();
    expect(gmailLink("fixture-001", null)).toBeNull();
    expect(gmailLink(null, null)).toBeNull();
  });
});
