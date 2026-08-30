'use strict';

class PalDefenderApiError extends Error {
  constructor(message, { status = null, code = null, details = null, cause = null } = {}) {
    super(message, { cause });
    this.name = 'PalDefenderApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function addQuery(url, query) {
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
}

class PalDefenderClient {
  constructor({ baseUrl, token, timeoutMs = 7000, fetchImpl = globalThis.fetch }) {
    if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async request(method, path, { body, query } = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    addQuery(url, query);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    let text;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      text = await response.text();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new PalDefenderApiError(`PalDefender did not respond within ${this.timeoutMs} ms.`, {
          code: 'CLIENT_TIMEOUT',
          cause: error,
        });
      }
      throw new PalDefenderApiError('Could not connect to the PalDefender REST API.', {
        code: 'CONNECTION_FAILED',
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }

    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const apiError = payload && typeof payload === 'object' ? payload.Error : null;
      throw new PalDefenderApiError(
        apiError?.Message || `PalDefender returned HTTP ${response.status}.`,
        {
          status: response.status,
          code: apiError?.Code || 'HTTP_ERROR',
          details: apiError?.Details || payload,
        },
      );
    }

    return payload;
  }

  get(path, query) {
    return this.request('GET', path, { query });
  }

  post(path, body = {}) {
    return this.request('POST', path, { body });
  }
}

module.exports = { PalDefenderApiError, PalDefenderClient };
