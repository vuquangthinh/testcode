# Orbit currency swap

Responsive vanilla JavaScript + Vite form with five currencies, direction reversal, max balance, fee breakdown, validation, loading feedback and accessible status announcements.

## Run

Use Node.js 22.13+.

```sh
cd src/problem2
npm install
npm run dev
```

`npm run build` creates `dist/`; `npm run preview` serves it locally.

The request mentions price/image URLs but omits the actual links. All prices and balances are explicitly illustrative constants. No external fonts, API, wallet access or analytics are used. A demo 0.3% fee is deducted from the sending amount before conversion. Previewing does not transfer funds or mutate balances. Inputs support a period decimal separator and up to eight fractional digits.

For production, use asset-specific decimal arithmetic and a trusted backend with expiring quotes, stale-price handling and independently authorized transactions. This demo uses JavaScript numbers only for illustration.

## Manual checks (not executed)

- Initial 1 ETH gives 3190.4 USDC after fees.
- Empty, zero, negative, malformed, excessive precision, over-balance and same-currency swaps are rejected.
- Reverse/max update the rate and totals; tiny amounts below display precision are rejected.
- Submission locks inputs, announces a preview, and restores controls without moving funds.
- Check mobile layout, keyboard focus and screen-reader field/status labels.
