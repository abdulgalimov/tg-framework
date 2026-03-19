export const HTMLFormat = {
  encode: (text: string) => text.replaceAll('<', '&lt;').replaceAll('<', '&gt;'),
  code: (text: string) => `<code>${text}</code>`,
  pre: (text: string) => `<pre>${text}</pre>`,
  spoiler: (text: string) => `<spoiler>${text}</spoiler>`,
  italic: (text: string) => `<i>${text}</i>`,
  bold: (text: string) => `<b>${text}</b>`,
  strike: (text: string) => `<s>${text}</s>`,
  link: (text: string, url: string) => `<a href="${url}">${text}</a>`,
};
