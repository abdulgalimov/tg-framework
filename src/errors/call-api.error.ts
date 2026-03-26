type TgResponseError = {
  error_code: number;
  description: string;
  parameters?: {
    retry_after?: number;
  };
};

export const TgErrorCodes = {
  UNKNOWN: 'UNKNOWN',
  MESSAGE_IS_NOT_MODIFIED: 'MESSAGE_IS_NOT_MODIFIED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
} as const;
export type TgErrorCodes = keyof typeof TgErrorCodes;

type CodeDescription = {
  message: string;
  code: TgErrorCodes;
};
const errorDescriptions: CodeDescription[] = [
  {
    message:
      'Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message',
    code: TgErrorCodes.MESSAGE_IS_NOT_MODIFIED,
  },
];
const errorDescriptionsMap = errorDescriptions.reduce(
  (acc, description: CodeDescription) => {
    acc[description.message] = description.code;
    return acc;
  },
  {} as Record<string, TgErrorCodes>,
);

export class CallApiError extends Error {
  public readonly code: TgErrorCodes;
  public readonly retryAfter?: number;
  public constructor(
    response: TgResponseError,
    public readonly method: string,
    public readonly body?: object | undefined,
  ) {
    super(response.description);

    if (response.error_code === 429) {
      this.code = TgErrorCodes.TOO_MANY_REQUESTS;
      this.retryAfter = response.parameters?.retry_after;
    } else {
      this.code = errorDescriptionsMap[response.description] || TgErrorCodes.UNKNOWN;
    }
  }
}
