# @abdulgalimov/telegram

TypeScript framework for building Telegram bots.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **Type-safe action tree routing** — hierarchical action tree with full TypeScript inference
- **Compact payload encoding** — schema-based callback_data encoding with automatic DB fallback for payloads >64 chars
- **Multi-step forms** — state machine with KV storage, auto-cleanup of messages, cancel button
- **Inline keyboard builders** — confirm menus, pagination, radio/checkbox switch buttons
- **AsyncLocalStorage context isolation** — each request runs in its own isolated context
- **Locale / i18n support** — key=value locale files with TextBuilder for HTML messages
- **Long polling** — built-in update polling with error handling
- **Middleware pipeline** — user creation, action resolution, form handling
- **Minimal dependencies** — only `uuid` at runtime

## Installation

```bash
npm install @abdulgalimov/telegram
```

### Peer Dependencies

```bash
npm install @grammyjs/types
```

## Quick Start

**1. Create locale files** — `locales/en.txt`, `locales/ru.txt`:

```
# locales/en.txt
welcome=Hello, ${name}!
hide-button=Hide
cancel-button=Cancel
back-button=Back
refresh-button=Refresh
```

**2. Create config** — `telegram.config.js` in project root:

```javascript
export default {
  localesDir: 'locales',
  defaultLocale: 'en',
  outputDir: 'locales/generated',
};
```

**3. Generate locale types:**

```bash
npx telegram-prepare
```

This creates `locales/generated/locale-types.ts` with a fully typed `LocaleKeysType`.

**4. Define action tree and types:**

```typescript
import { readFileSync } from 'node:fs';
import {
  Telegram,
  payloadSchema,
  type InitType,
  type TgUser,
} from '@abdulgalimov/telegram';
import type { LocaleKeysType } from './locales/generated/locale-types';

const actionsTree = {
  core: {
    none: {},
    hide: {},
    command: { '@payloads': payloadSchema.object({ command: payloadSchema.string(), value: payloadSchema.string().optional() }) },
    text: {},
    inline: { '@payloads': payloadSchema.object({ query: payloadSchema.string() }), select: { '@payloads': payloadSchema.object({ query: payloadSchema.string() }) } },
    viaBot: {},
    keyboard: { button: { '@payloads': payloadSchema.object({ label: payloadSchema.string().optional() }) } },
  },
  // Custom actions
  menu: {},
  settings: {
    '@payloads': payloadSchema.object({ page: payloadSchema.number().optional() }),
  },
};

type MyUser = TgUser & { name: string };
type MyTree = typeof actionsTree;
type MyInit = InitType & { user: MyUser; locale: LocaleKeysType; tree: MyTree };

// 5. Create Telegram instance
const tg = new Telegram<MyInit>({
  config: {
    apiUrl: 'https://api.telegram.org',
    token: process.env.BOT_TOKEN!,
    debug: {
      payloadDecoderLevel: 'error',
      telegramCallServiceLevel: 'error',
      telegramUpdateLevel: 'error',
    },
  },
  actionsTree,
  loggerFactory: myLoggerFactory,
});

// 6. Create services (connect store, kv, locale)
tg.create({
  store: myStore,
  kv: myKvStore,
  locale: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', text: readFileSync('locales/en.txt', 'utf-8') },
      { code: 'ru', text: readFileSync('locales/ru.txt', 'utf-8') },
    ],
  },
});

// 7. Initialize and start polling
await tg.init(async () => {
  const ctx = tg.context.get();
  const { action, payload, user } = ctx;

  const tree = tg.actions.tree;

  if (action === tree.core.command) {
    const { command } = payload;
    if (command === '/start') {
      await tg.request.reply({ text: `Welcome, ${user.name}!`, parse_mode: 'HTML' });
    }
    return;
  }

  if (action === tree.menu) {
    await tg.request.reply({ text: 'Main menu' });
    return;
  }

  if (action === tree.settings) {
    const { page } = payload;
    await tg.request.reply({ text: `Settings page ${page || 1}` });
    return;
  }
});
```

## Core Concepts

### Action Tree

The action tree is a hierarchical structure that defines all routes in your bot. Every tree must include core actions:

```typescript
const actionsTree = {
  core: {
    none: {},       // No-op / default action
    hide: {},       // Hide message
    command: {},    // Slash commands (/start, /help)
    text: {},       // Free text input
    inline: {       // Inline queries
      select: {},   // Inline result selection
    },
    viaBot: {},     // Messages sent via bot
    keyboard: {     // Reply keyboard
      button: {},   // Reply keyboard button press
    },
  },
  // Your custom actions:
  wallet: {
    send: {
      '@payloads': payloadSchema.object({
        tokenAddress: payloadSchema.string(),
        amount: payloadSchema.number().optional(),
      }),
      confirm: {},
      reject: {},
    },
  },
};
```

Actions are resolved automatically from updates: commands map to `core.command`, callback queries are decoded by payload, text messages go to `core.text` (or active form), and inline queries go to `core.inline`.

### Payload System

Payloads encode typed parameters into Telegram's `callback_data` (max 64 bytes). Available schema types:

```typescript
import { payloadSchema } from '@abdulgalimov/telegram';

payloadSchema.string()    // string values
payloadSchema.number()    // numeric values
payloadSchema.bigint()    // bigint values
payloadSchema.boolean()   // boolean values
payloadSchema.enum(['a', 'b', 'c'])  // enum (string or number)
payloadSchema.object({ key: payloadSchema.string() })  // composite object

// Any schema supports .optional()
payloadSchema.number().optional()
```

Attach a payload schema to an action using the `@payloads` key:

```typescript
const action = {
  '@payloads': payloadSchema.object({
    page: payloadSchema.number(),
    filter: payloadSchema.string().optional(),
  }),
};
```

Encoding format: `v1_salt_actionId_key1_value1_key2_value2`. If the encoded payload exceeds 64 characters, it is automatically stored in the database and replaced with `db_[UUID]`.

Use `configureShortValues()` to define abbreviations for frequently used payload values.

### Context

Each request runs inside an `AsyncLocalStorage` context. Access it via:

```typescript
const ctx = tg.context.get();

ctx.action;   // Current resolved action
ctx.payload;  // Decoded payload (typed by action's @payloads schema)
ctx.user;     // Current user (your TgUser extension)
ctx.update;   // Raw Telegram Update object
ctx.form;     // Active form (if any)
ctx.flags;    // Request flags (callbackAnswered, messageDeleted, etc.)
ctx.from;     // Telegram User object from the update
ctx.inline;   // Inline query data
```

### Request Service

Send messages and interact with the Telegram API:

```typescript
// Reply (edits callback message or sends new)
await tg.request.reply({
  text: 'Hello!',
  parse_mode: 'HTML',
  reply_markup: { inline_keyboard: [[{ text: 'Click', callback_data: '...' }]] },
});

// Reply with options
await tg.request.reply(
  { text: 'New message' },
  { sendMode: true, tryReplyMessage: true },
);

// Send a photo
await tg.request.sendPhoto({ photo: 'https://example.com/image.jpg', caption: 'Photo' });

// Delete messages
await tg.request.delete();             // delete current message
await tg.request.delete(messageId);    // delete specific message
await tg.request.delete([id1, id2]);   // delete multiple messages

// Answer callback query
await tg.request.answerCallbackQuery({ text: 'Done!' });

// Show alert popup
await tg.request.showAlert('Are you sure?');

// Redirect callback to URL
await tg.request.redirectCallback('https://example.com');

// Answer inline query
await tg.request.answerInlineQuery({ results: [...] });
```

### Keyboards

#### Inline Keyboards

```typescript
// Confirm menu (Yes/No)
await tg.inlineKeyboard.confirmMenu({
  action: tree.wallet.send,  // must have .confirm and .reject
  text: 'Send 1 ETH?',
  yesLabel: 'Yes',
  noLabel: 'No',
});

// Pagination buttons
const buttons = tg.inlineKeyboard.pagingButtons({
  action: tree.settings,  // must have { page?: number } payload
  currentPage: 3,
  totalPages: 10,
});

// Switch (radio) buttons
const rows = tg.inlineKeyboard.switchButtons({
  action: tree.settings,
  mode: SwitchButtonMode.Radio,
  maxOnLine: 3,
  callbackField: 'filter',
  currentValue: 'all',
  buttons: [
    { label: 'All', payload: { filter: 'all' } },
    { label: 'Active', payload: { filter: 'active' } },
  ],
});

// Back button
const back = tg.inlineKeyboard.backButton({ actionItem: tree.menu });

// Refresh button (re-encodes current action)
const refresh = tg.inlineKeyboard.refreshButton();
```

### Forms

Multi-step forms with state stored in KV:

```typescript
// Define a form action
const actionsTree = {
  // ...
  createWallet: {
    progress: {},   // Required: handles each form step
    cancel: {},     // Optional: cancel button action
  },
};

// In your handler — start a form
const form = await tg.form.create({
  action: tree.createWallet,
  defaultData: { step: 1, name: '' },
});

// Ask for input
await tg.form.reply({ text: 'Enter wallet name:' });

// In form.progress handler — process user input
const ctx = tg.context.get();
const form = ctx.form;
const userText = ctx.update.message?.text;

form.data.name = userText;
form.data.step = 2;
await tg.form.save(form);

// When done — delete form and continue
await tg.form.delete();
```

Form features:
- State persisted in KV as `user_form_{userId}`
- Auto-deletes user messages during form flow
- Automatically adds a cancel button (using locale key `cancel-button`)
- `form.reply()` — sends/edits form prompt
- `form.send()` — sends additional message tracked in form history

### Locale / i18n

Locale types are **auto-generated** from `.txt` files. You never define them manually.

**1. Create locale files** in `key=value` format with `${arg}` interpolation:

```
# locales/en.txt
welcome=Hello, ${name}!
balance=Balance: ${amount}
hide-button=Hide
cancel-button=Cancel
back-button=Back
refresh-button=Refresh
```

```
# locales/ru.txt
welcome=Привет, ${name}!
balance=Баланс: ${amount}
hide-button=Скрыть
cancel-button=Отмена
back-button=Назад
refresh-button=Обновить
```

**2. Create `telegram.config.js`** in project root:

```javascript
export default {
  localesDir: 'locales',
  defaultLocale: 'en',
  outputDir: 'locales/generated',
};
```

**3. Run code generation** before building your app:

```bash
npx telegram-prepare
```

This reads the default locale file, parses all keys and `${arg}` placeholders, and generates `locales/generated/locale-types.ts`:

```typescript
// This file is auto-generated by tg-framework. Do not edit manually.

type ArgValue = string | number;

export type LocaleKeysType = {
  "welcome": { text: "Hello, ${name}!"; args: { name: ArgValue } };
  "balance": { text: "Balance: ${amount}"; args: { amount: ArgValue } };
  "hide-button": { text: "Hide"; args: undefined };
  "cancel-button": { text: "Cancel"; args: undefined };
  "back-button": { text: "Back"; args: undefined };
  "refresh-button": { text: "Refresh"; args: undefined };
};
```

**4. Import and use** — the generated type plugs into `InitType`:

```typescript
import type { LocaleKeysType } from './locales/generated/locale-types';

type MyInit = InitType & { user: MyUser; locale: LocaleKeysType; tree: MyTree };
```

**5. Pass locale data at runtime** — read `.txt` files and pass their content:

```typescript
import { readFileSync } from 'node:fs';

tg.create({
  // ...
  locale: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', text: readFileSync('locales/en.txt', 'utf-8') },
      { code: 'ru', text: readFileSync('locales/ru.txt', 'utf-8') },
    ],
  },
});
```

**6. Use in handler** — fully type-safe:

```typescript
// Get localized text (key and args are type-checked)
const text = tg.locale.text('welcome', { args: { name: 'Alice' } });

// TextBuilder — fluent API for HTML messages
const message = tg.locale.build()
  .addLocale('welcome', { args: { name: 'Alice' } })
  .break()
  .addText('Your balance:', { bold: true })
  .appendText(' 100 USDT', { code: true })
  .addSection()
  .addText('Choose an option:')
  .toString();
```

Required locale keys: `hide-button`, `cancel-button`, `back-button`, `refresh-button`.

> **Tip:** Add `npx telegram-prepare` to your build script (e.g. `"prebuild": "telegram-prepare"`) so types stay in sync.

### Redirect

The handler can return a redirect to chain actions (max 5 redirects):

```typescript
import { redirectAction } from '@abdulgalimov/telegram';

await tg.init(async () => {
  const ctx = tg.context.get();
  const tree = tg.actions.tree;

  if (action === tree.core.command) {
    // Redirect /start to menu
    return { redirect: redirectAction({ action: tree.menu }) };
  }

  if (action === tree.menu) {
    await tg.request.reply({ text: 'Menu' });
  }
});
```

Redirect with payload:

```typescript
return {
  redirect: redirectAction({
    action: tree.settings,
    payload: { page: 1 },
  }),
};
```

## Interfaces to Implement

| Interface | Purpose |
|---|---|
| `TelegramStore` | Database adapter: `actions`, `users`, `inlineKeyboards`, `replyKeyboards` |
| `ActionsStore` | `createAll(paths)` — persist action paths and return IDs |
| `UsersStore<TUser>` | `createOrUpdate(data)` — upsert user by Telegram ID |
| `InlineKeyboardsStore` | Store/retrieve long payloads, track message contexts |
| `ReplyKeyboardsStore` | Store/retrieve reply keyboard state per chat |
| `KvStore` | Key-value store: `getValue`, `setValue`, `removeValue`, `expire` |
| `TgLoggerFactory` | `create(name)` — returns `TgLogger` instance |
| `TgLogger` | `error`, `warn`, `info`, `debug`, `setLogLevel` |

`TgUser` base interface (extend with your own fields):

```typescript
interface TgUser {
  id: bigint;
  telegramId: number;
  langCode: string | null;
}
```

## Configuration

```typescript
type TelegramConfig = {
  apiUrl: string;     // Telegram API URL (https://api.telegram.org)
  token: string;      // Bot token from @BotFather
  debug: {
    payloadDecoderLevel: string;       // Log level for payload decoding
    telegramCallServiceLevel: string;  // Log level for API calls
    telegramUpdateLevel: string;       // Log level for update processing
  };
};
```

## Update Pipeline

```
Update → AsyncContext → UserMw → ActionsMw → handler → redirect chain → auto-answer callback → batch delete
```

1. **Long Polling** — fetches updates from Telegram API
2. **AsyncContext** — creates isolated AsyncLocalStorage context
3. **UserMw** — creates or updates user in the database
4. **ActionsMw** — resolves the action:
   - Active form → `form.progress`
   - Text → command (`/cmd`) | text | viaBot
   - Callback query → decode payload → action
   - Inline query → inline action
5. **Handler** — your business logic
6. **Redirect** — chains up to 5 redirects between actions
7. **Auto-answer** — automatically answers unanswered callback queries
8. **Batch delete** — deletes all messages marked for deletion during the request

## Utilities

### HTMLFormat

Static methods for Telegram HTML formatting:

```typescript
import { HTMLFormat } from '@abdulgalimov/telegram';

HTMLFormat.bold('text')           // <b>text</b>
HTMLFormat.italic('text')         // <i>text</i>
HTMLFormat.code('text')           // <code>text</code>
HTMLFormat.pre('text')            // <pre>text</pre>
HTMLFormat.strike('text')         // <s>text</s>
HTMLFormat.spoiler('text')        // <spoiler>text</spoiler>
HTMLFormat.blockquote('text')     // <blockquote>text</blockquote>
HTMLFormat.link('text', 'url')    // <a href="url">text</a>
HTMLFormat.encode('a < b')        // escapes HTML entities
```

### TextBuilder

Fluent API for building HTML messages (see [Locale / i18n](#locale--i18n)):

```typescript
const text = tg.locale.build()
  .addLocale('key')                  // add localized line
  .addText('raw text')               // add raw text line
  .appendText(' suffix')             // append to last line
  .appendText('value', { bold: true })  // append with formatting
  .appendButton('Click', 'https://...')  // append link
  .addSection()                      // add separator line
  .break()                           // add empty line
  .toString();
```

## Template

For a production-ready example, see the template bot:

**[telegram-bot-template](https://github.com/abdulgalimov/telegram-bot-template)**

## License

MIT
