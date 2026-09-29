/**
 * html-to-text ships without type definitions. This declares the one function
 * the mailbox reader uses; the options are left open.
 */
declare module "html-to-text" {
  export function convert(html: string, options?: Record<string, unknown>): string;
}
