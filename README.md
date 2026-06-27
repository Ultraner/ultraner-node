# Ultraner Node SDK

One API for payments across Africa: mobile money, cards, PayPal and wallets. Live in Tanzania and Rwanda, expanding across the continent.

- Docs: https://ultraner.com/docs
- OpenAPI: https://ultraner.com/openapi.json
- For AI: https://ultraner.com/ai

## Install

```bash
npm install @ultraner/sdk
```

## Usage

```ts
import Ultraner from '@ultraner/sdk';

const ultraner = new Ultraner(process.env.ULTRANER_API_KEY!);

// Charge a mobile-money wallet
const payment = await ultraner.payments.createMobileMoney({
  amount: 5000,
  currency: 'TZS',
  provider: 'Vodacom',
  accountNumber: '255700000000',
  externalId: 'order_1001',
});

// Poll status
const status = await ultraner.payments.getStatus(payment.reference);

// Wallet, transfers, transactions
await ultraner.wallet.get();
await ultraner.transactions.list({ page: 1, limit: 20 });

// Escrow
const escrow = await ultraner.escrow.create({ amount: 10000, currency: 'TZS', recipient: 'vendor@example.com' });
await ultraner.escrow.release(escrow.escrowCode);

// International payers
await ultraner.paypal.createOrder({ amount: 25, currency: 'USD' });
await ultraner.stripe.createSession({ amount: 2500, currency: 'usd' });
```

## Configuration

```ts
new Ultraner('sk_live_...', { baseUrl: 'https://api.ultraner.com', timeoutMs: 30000 });
```

Errors throw `UltranerError` with `status` and `code`.

## License

MIT
