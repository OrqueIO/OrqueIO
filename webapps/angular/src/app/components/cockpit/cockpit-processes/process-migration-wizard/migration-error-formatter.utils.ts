/**
 * Formats migration error messages for better user experience.
 *
 * This utility transforms technical engine error messages into user-friendly,
 * actionable messages while preserving the original raw message.
 */

export interface FormattedError {
  formatted: string;
  raw: string;
  wasFormatted: boolean;
}

/**
 * @param rawMessage
 * @returns
 */
export function formatErrorMessage(rawMessage: string): FormattedError {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return {
      formatted: rawMessage || '',
      raw: rawMessage || '',
      wasFormatted: false
    };
  }

  const normalized = rawMessage.trim().toLowerCase().replace(/\.\s*$/, '');

  if (normalized === 'target activity is not asyncbefore') {
    return {
      formatted: 'migration.results.errors.targetNotAsyncBefore',
      raw: rawMessage,
      wasFormatted: true
    };
  }

  return {
    formatted: rawMessage,
    raw: rawMessage,
    wasFormatted: false
  };
}

/**
 * @param rawMessages
 * @returns
 */
export function formatErrorMessages(rawMessages: string[]): FormattedError[] {
  if (!Array.isArray(rawMessages)) {
    return [];
  }
  return rawMessages.map(msg => formatErrorMessage(msg));
}
