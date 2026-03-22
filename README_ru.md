# @abdulgalimov/telegram

TypeScript-фреймворк для построения Telegram-ботов.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Возможности

- **Типобезопасная маршрутизация через дерево действий** — иерархическое дерево действий с полным выводом типов TypeScript
- **Компактное кодирование payload** — schema-based кодирование callback_data с автоматическим сохранением в БД при превышении 64 символов
- **Многошаговые формы** — стейт-машина с хранением состояния в KV, автоочистка сообщений, кнопка отмены
- **Билдеры inline-клавиатур** — меню подтверждения, пагинация, radio/checkbox переключатели
- **Изоляция контекста через AsyncLocalStorage** — каждый запрос выполняется в собственном изолированном контексте
- **Поддержка локализации (i18n)** — файлы локализации в формате key=value с TextBuilder для HTML-сообщений
- **Long polling** — встроенный polling обновлений с обработкой ошибок
- **Middleware pipeline** — создание пользователей, определение действий, обработка форм
- **Минимум зависимостей** — только `uuid` в рантайме

## Установка

```bash
npm install @abdulgalimov/telegram
```

### Peer-зависимости

```bash
npm install @grammyjs/types
```

## Быстрый старт

**1. Создайте файлы локализации** — `locales/en.txt`, `locales/ru.txt`:

```
# locales/ru.txt
welcome=Привет, ${name}!
hide-button=Скрыть
cancel-button=Отмена
back-button=Назад
refresh-button=Обновить
```

**2. Создайте конфиг** — `telegram.config.js` в корне проекта:

```javascript
export default {
  localesDir: 'locales',
  defaultLocale: 'ru',
  outputDir: 'locales/generated',
};
```

**3. Сгенерируйте типы локализации:**

```bash
npx telegram-prepare
```

Это создаст `locales/generated/locale-types.ts` с полностью типизированным `LocaleKeysType`.

**4. Определите дерево действий и типы:**

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
  // Пользовательские действия
  menu: {},
  settings: {
    '@payloads': payloadSchema.object({ page: payloadSchema.number().optional() }),
  },
};

type MyUser = TgUser & { name: string };
type MyTree = typeof actionsTree;
type MyInit = InitType & { user: MyUser; locale: LocaleKeysType; tree: MyTree };

// 5. Создайте экземпляр Telegram
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

// 6. Создайте сервисы (подключите store, kv, locale)
tg.create({
  store: myStore,
  kv: myKvStore,
  locale: {
    defaultLocale: 'ru',
    locales: [
      { code: 'en', text: readFileSync('locales/en.txt', 'utf-8') },
      { code: 'ru', text: readFileSync('locales/ru.txt', 'utf-8') },
    ],
  },
});

// 7. Инициализируйте и запустите polling
await tg.init(async () => {
  const ctx = tg.context.get();
  const { action, payload, user } = ctx;

  const tree = tg.actions.tree;

  if (action === tree.core.command) {
    const { command } = payload;
    if (command === '/start') {
      await tg.request.reply({ text: `Привет, ${user.name}!`, parse_mode: 'HTML' });
    }
    return;
  }

  if (action === tree.menu) {
    await tg.request.reply({ text: 'Главное меню' });
    return;
  }

  if (action === tree.settings) {
    const { page } = payload;
    await tg.request.reply({ text: `Настройки, страница ${page || 1}` });
    return;
  }
});
```

## Основные концепции

### Дерево действий

Дерево действий — иерархическая структура, определяющая все маршруты бота. Каждое дерево должно содержать core-действия:

```typescript
const actionsTree = {
  core: {
    none: {},       // Нет действия / по умолчанию
    hide: {},       // Скрыть сообщение
    command: {},    // Slash-команды (/start, /help)
    text: {},       // Свободный текстовый ввод
    inline: {       // Inline-запросы
      select: {},   // Выбор inline-результата
    },
    viaBot: {},     // Сообщения, отправленные через бота
    keyboard: {     // Reply-клавиатура
      button: {},   // Нажатие кнопки reply-клавиатуры
    },
  },
  // Ваши действия:
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

Действия определяются автоматически из обновлений: команды маршрутизируются в `core.command`, callback-запросы декодируются по payload, текстовые сообщения идут в `core.text` (или в активную форму), inline-запросы — в `core.inline`.

### Система Payload

Payload кодируют типизированные параметры в `callback_data` Telegram (макс. 64 байта). Доступные типы схем:

```typescript
import { payloadSchema } from '@abdulgalimov/telegram';

payloadSchema.string()    // строковые значения
payloadSchema.number()    // числовые значения
payloadSchema.bigint()    // bigint значения
payloadSchema.boolean()   // булевы значения
payloadSchema.enum(['a', 'b', 'c'])  // enum (строка или число)
payloadSchema.object({ key: payloadSchema.string() })  // составной объект

// Любая схема поддерживает .optional()
payloadSchema.number().optional()
```

Привяжите схему payload к действию с помощью ключа `@payloads`:

```typescript
const action = {
  '@payloads': payloadSchema.object({
    page: payloadSchema.number(),
    filter: payloadSchema.string().optional(),
  }),
};
```

Формат кодирования: `v1_salt_actionId_key1_value1_key2_value2`. Если закодированный payload превышает 64 символа, он автоматически сохраняется в базу данных и заменяется на `db_[UUID]`.

Используйте `configureShortValues()` для определения сокращений часто используемых значений payload.

### Контекст

Каждый запрос выполняется внутри контекста `AsyncLocalStorage`. Доступ к нему:

```typescript
const ctx = tg.context.get();

ctx.action;   // Текущее определённое действие
ctx.payload;  // Декодированный payload (типизирован по схеме @payloads действия)
ctx.user;     // Текущий пользователь (ваше расширение TgUser)
ctx.update;   // Сырой объект Update из Telegram
ctx.form;     // Активная форма (если есть)
ctx.flags;    // Флаги запроса (callbackAnswered, messageDeleted и т.д.)
ctx.from;     // Объект Telegram User из обновления
ctx.inline;   // Данные inline-запроса
```

### Сервис запросов

Отправка сообщений и взаимодействие с Telegram API:

```typescript
// Reply (редактирует callback-сообщение или отправляет новое)
await tg.request.reply({
  text: 'Привет!',
  parse_mode: 'HTML',
  reply_markup: { inline_keyboard: [[{ text: 'Нажми', callback_data: '...' }]] },
});

// Reply с опциями
await tg.request.reply(
  { text: 'Новое сообщение' },
  { sendMode: true, tryReplyMessage: true },
);

// Отправка фото
await tg.request.sendPhoto({ photo: 'https://example.com/image.jpg', caption: 'Фото' });

// Удаление сообщений
await tg.request.delete();             // удалить текущее сообщение
await tg.request.delete(messageId);    // удалить конкретное сообщение
await tg.request.delete([id1, id2]);   // удалить несколько сообщений

// Ответ на callback query
await tg.request.answerCallbackQuery({ text: 'Готово!' });

// Показать всплывающее уведомление
await tg.request.showAlert('Вы уверены?');

// Перенаправить callback на URL
await tg.request.redirectCallback('https://example.com');

// Ответ на inline-запрос
await tg.request.answerInlineQuery({ results: [...] });
```

### Клавиатуры

#### Inline-клавиатуры

```typescript
// Меню подтверждения (Да/Нет)
await tg.inlineKeyboard.confirmMenu({
  action: tree.wallet.send,  // должно иметь .confirm и .reject
  text: 'Отправить 1 ETH?',
  yesLabel: 'Да',
  noLabel: 'Нет',
});

// Кнопки пагинации
const buttons = tg.inlineKeyboard.pagingButtons({
  action: tree.settings,  // должно иметь payload { page?: number }
  currentPage: 3,
  totalPages: 10,
});

// Switch-кнопки (radio)
const rows = tg.inlineKeyboard.switchButtons({
  action: tree.settings,
  mode: SwitchButtonMode.Radio,
  maxOnLine: 3,
  callbackField: 'filter',
  currentValue: 'all',
  buttons: [
    { label: 'Все', payload: { filter: 'all' } },
    { label: 'Активные', payload: { filter: 'active' } },
  ],
});

// Кнопка «Назад»
const back = tg.inlineKeyboard.backButton({ actionItem: tree.menu });

// Кнопка обновления (перекодирует текущее действие)
const refresh = tg.inlineKeyboard.refreshButton();
```

### Формы

Многошаговые формы с хранением состояния в KV:

```typescript
// Определите действие формы
const actionsTree = {
  // ...
  createWallet: {
    progress: {},   // Обязательно: обрабатывает каждый шаг формы
    cancel: {},     // Опционально: действие кнопки отмены
  },
};

// В обработчике — запустите форму
const form = await tg.form.create({
  action: tree.createWallet,
  defaultData: { step: 1, name: '' },
});

// Запросите ввод
await tg.form.reply({ text: 'Введите имя кошелька:' });

// В обработчике form.progress — обработайте ввод пользователя
const ctx = tg.context.get();
const form = ctx.form;
const userText = ctx.update.message?.text;

form.data.name = userText;
form.data.step = 2;
await tg.form.save(form);

// По завершении — удалите форму и продолжите
await tg.form.delete();
```

Возможности форм:
- Состояние сохраняется в KV как `user_form_{userId}`
- Автоудаление сообщений пользователя во время заполнения формы
- Автоматическое добавление кнопки отмены (ключ локализации `cancel-button`)
- `form.reply()` — отправляет/редактирует запрос формы
- `form.send()` — отправляет дополнительное сообщение, отслеживаемое в истории формы

### Локализация / i18n

Типы локализации **генерируются автоматически** из `.txt` файлов. Определять их вручную не нужно.

**1. Создайте файлы локализации** в формате `key=value` с интерполяцией `${arg}`:

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

**2. Создайте `telegram.config.js`** в корне проекта:

```javascript
export default {
  localesDir: 'locales',
  defaultLocale: 'ru',
  outputDir: 'locales/generated',
};
```

**3. Запустите генерацию кода** перед сборкой приложения:

```bash
npx telegram-prepare
```

Скрипт читает файл локализации по умолчанию, парсит все ключи и плейсхолдеры `${arg}`, и генерирует `locales/generated/locale-types.ts`:

```typescript
// This file is auto-generated by tg-framework. Do not edit manually.

type ArgValue = string | number;

export type LocaleKeysType = {
  "welcome": { text: "Привет, ${name}!"; args: { name: ArgValue } };
  "balance": { text: "Баланс: ${amount}"; args: { amount: ArgValue } };
  "hide-button": { text: "Скрыть"; args: undefined };
  "cancel-button": { text: "Отмена"; args: undefined };
  "back-button": { text: "Назад"; args: undefined };
  "refresh-button": { text: "Обновить"; args: undefined };
};
```

**4. Импортируйте и используйте** — сгенерированный тип подключается в `InitType`:

```typescript
import type { LocaleKeysType } from './locales/generated/locale-types';

type MyInit = InitType & { user: MyUser; locale: LocaleKeysType; tree: MyTree };
```

**5. Передайте данные локализации в рантайме** — прочитайте `.txt` файлы и передайте их содержимое:

```typescript
import { readFileSync } from 'node:fs';

tg.create({
  // ...
  locale: {
    defaultLocale: 'ru',
    locales: [
      { code: 'en', text: readFileSync('locales/en.txt', 'utf-8') },
      { code: 'ru', text: readFileSync('locales/ru.txt', 'utf-8') },
    ],
  },
});
```

**6. Используйте в обработчике** — полная типобезопасность:

```typescript
// Получение локализованного текста (ключ и аргументы проверяются типами)
const text = tg.locale.text('welcome', { args: { name: 'Alice' } });

// TextBuilder — fluent API для HTML-сообщений
const message = tg.locale.build()
  .addLocale('welcome', { args: { name: 'Alice' } })
  .break()
  .addText('Ваш баланс:', { bold: true })
  .appendText(' 100 USDT', { code: true })
  .addSection()
  .addText('Выберите действие:')
  .toString();
```

Обязательные ключи локализации: `hide-button`, `cancel-button`, `back-button`, `refresh-button`.

> **Совет:** Добавьте `npx telegram-prepare` в ваш build-скрипт (например, `"prebuild": "telegram-prepare"`), чтобы типы всегда были актуальны.

### Redirect

Обработчик может вернуть redirect для цепочки действий (максимум 5 перенаправлений):

```typescript
import { redirectAction } from '@abdulgalimov/telegram';

await tg.init(async () => {
  const ctx = tg.context.get();
  const tree = tg.actions.tree;

  if (action === tree.core.command) {
    // Перенаправить /start на меню
    return { redirect: redirectAction({ action: tree.menu }) };
  }

  if (action === tree.menu) {
    await tg.request.reply({ text: 'Меню' });
  }
});
```

Redirect с payload:

```typescript
return {
  redirect: redirectAction({
    action: tree.settings,
    payload: { page: 1 },
  }),
};
```

## Интерфейсы для реализации

| Интерфейс | Назначение |
|---|---|
| `TelegramStore` | Адаптер БД: `actions`, `users`, `inlineKeyboards`, `replyKeyboards` |
| `ActionsStore` | `createAll(paths)` — сохранение путей действий и возврат ID |
| `UsersStore<TUser>` | `createOrUpdate(data)` — upsert пользователя по Telegram ID |
| `InlineKeyboardsStore` | Хранение/извлечение длинных payload, отслеживание контекстов сообщений |
| `ReplyKeyboardsStore` | Хранение/извлечение состояния reply-клавиатуры по чату |
| `KvStore` | Key-value хранилище: `getValue`, `setValue`, `removeValue`, `expire` |
| `TgLoggerFactory` | `create(name)` — возвращает экземпляр `TgLogger` |
| `TgLogger` | `error`, `warn`, `info`, `debug`, `setLogLevel` |

Базовый интерфейс `TgUser` (расширяйте своими полями):

```typescript
interface TgUser {
  id: bigint;
  telegramId: number;
  langCode: string | null;
}
```

## Конфигурация

```typescript
type TelegramConfig = {
  apiUrl: string;     // URL Telegram API (https://api.telegram.org)
  token: string;      // Токен бота от @BotFather
  debug: {
    payloadDecoderLevel: string;       // Уровень логирования декодирования payload
    telegramCallServiceLevel: string;  // Уровень логирования вызовов API
    telegramUpdateLevel: string;       // Уровень логирования обработки обновлений
  };
};
```

## Pipeline обработки обновлений

```
Update → AsyncContext → UserMw → ActionsMw → handler → redirect chain → auto-answer callback → batch delete
```

1. **Long Polling** — получение обновлений из Telegram API
2. **AsyncContext** — создание изолированного контекста AsyncLocalStorage
3. **UserMw** — создание или обновление пользователя в базе данных
4. **ActionsMw** — определение действия:
   - Активная форма → `form.progress`
   - Текст → команда (`/cmd`) | текст | viaBot
   - Callback query → декодирование payload → действие
   - Inline query → inline-действие
5. **Handler** — ваша бизнес-логика
6. **Redirect** — цепочка до 5 перенаправлений между действиями
7. **Auto-answer** — автоматический ответ на неотвеченные callback query
8. **Batch delete** — удаление всех сообщений, помеченных для удаления в ходе запроса

## Утилиты

### HTMLFormat

Статические методы для HTML-форматирования Telegram:

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
HTMLFormat.encode('a < b')        // экранирует HTML-сущности
```

### TextBuilder

Fluent API для построения HTML-сообщений (см. [Локализация / i18n](#локализация--i18n)):

```typescript
const text = tg.locale.build()
  .addLocale('key')                  // добавить локализованную строку
  .addText('raw text')               // добавить строку текста
  .appendText(' suffix')             // дополнить последнюю строку
  .appendText('value', { bold: true })  // дополнить с форматированием
  .appendButton('Click', 'https://...')  // добавить ссылку
  .addSection()                      // добавить разделитель
  .break()                           // добавить пустую строку
  .toString();
```

## Шаблон

Готовый к продакшену пример — шаблон бота:

**[telegram-bot-template](https://github.com/abdulgalimov/telegram-bot-template)**

## Лицензия

MIT
