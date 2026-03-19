export type HtmlOptions = {
  bold?: boolean | null;
  italic?: boolean | null;
  code?: boolean | null;
  pre?: boolean | null;
  url?: string | null;
  spoiler?: boolean | null;
  strike?: boolean | null;
  blockquote?: boolean | null;
};

export const HTMLFormat = {
  encode: (text: string) => text.replaceAll('<', '&lt;').replaceAll('<', '&gt;'),
  code: (text: string) => `<code>${text}</code>`,
  pre: (text: string) => `<pre>${text}</pre>`,
  spoiler: (text: string) => `<spoiler>${text}</spoiler>`,
  italic: (text: string) => `<i>${text}</i>`,
  bold: (text: string) => `<b>${text}</b>`,
  strike: (text: string) => `<s>${text}</s>`,
  blockquote: (text: string) => `<blockquote>${text}</blockquote>`,
  link: (text: string, url: string) => `<a href="${url}">${text}</a>`,
};
