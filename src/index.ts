/**
 * Ultraner Node/TypeScript SDK
 * One API for payments across Africa: mobile money, cards, PayPal, wallets.
 * Docs: https://ultraner.com/docs  ·  Spec: https://ultraner.com/openapi.json
 */

export interface UltranerOptions {
  /** API base URL. Defaults to the production gateway. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 30000. */
  timeoutMs?: number;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
}

export class UltranerError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'UltranerError';
    this.code = code;
    this.status = status;
  }
}

export interface MobileMoneyCharge {
  amount: number;
  currency: 'TZS' | 'RWF' | string;
  provider: string;
  accountNumber: string;
  externalId?: string;
}

export interface DisbursementInput {
  amount: number;
  currency: string;
  provider: string;
  accountNumber: string;
  externalId?: string;
}

export interface TransferInput {
  amount: number;
  currency: string;
  recipient: string;
}

export interface EscrowInput {
  amount: number;
  currency: string;
  recipient: string;
  description?: string;
}

export interface PaymentResponse {
  reference: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  amount: number;
  currency: string;
  provider?: string;
  createdAt?: string;
}

export class Ultraner {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly _fetch: typeof fetch;

  constructor(apiKey: string, options: UltranerOptions = {}) {
    if (!apiKey) throw new Error('Ultraner: an API key is required.');
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.ultraner.com').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 30000;
    this._fetch = options.fetch ?? globalThis.fetch;
    if (!this._fetch) throw new Error('Ultraner: no fetch implementation available (use Node 18+ or pass options.fetch).');
  }

  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this._fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw new UltranerError(json.message ?? 'Request failed', json.code ?? 'ERROR', res.status);
      }
      return (json.data ?? json) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  payments = {
    createMobileMoney: (input: MobileMoneyCharge) =>
      this.request<PaymentResponse>('POST', '/v1/payments/express/mno', input),
    getStatus: (reference: string) =>
      this.request<PaymentResponse>('GET', `/v1/payments/express/status/${encodeURIComponent(reference)}`),
  };

  disbursements = {
    create: (input: DisbursementInput) =>
      this.request<PaymentResponse>('POST', '/v1/disbursements', input),
  };

  wallet = {
    get: () => this.request('GET', '/v1/wallet'),
    transfer: (input: TransferInput) => this.request<PaymentResponse>('POST', '/v1/transfer', input),
  };

  transactions = {
    list: (params: { page?: number; limit?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.page) q.set('page', String(params.page));
      if (params.limit) q.set('limit', String(params.limit));
      const qs = q.toString();
      return this.request('GET', `/v1/transactions${qs ? `?${qs}` : ''}`);
    },
  };

  escrow = {
    create: (input: EscrowInput) => this.request('POST', '/v1/escrow', input),
    release: (escrowCode: string) =>
      this.request('POST', `/v1/escrow/${encodeURIComponent(escrowCode)}/release`),
    list: () => this.request('GET', '/v1/escrow'),
  };

  paypal = {
    createOrder: (input: { amount: number; currency: string; returnUrl?: string; cancelUrl?: string }) =>
      this.request('POST', '/paypal/orders', input),
    captureOrder: (orderId: string) =>
      this.request('POST', `/paypal/orders/${encodeURIComponent(orderId)}/capture`),
  };

  stripe = {
    createSession: (input: { amount: number; currency: string; successUrl?: string; cancelUrl?: string }) =>
      this.request('POST', '/stripe/sessions', input),
  };
}

export default Ultraner;
