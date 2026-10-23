import { useMemo, type ComponentPropsWithoutRef } from 'react';

export interface WalletBalance {
  id: string;
  blockchain: string;
  currency: string;
  amount: number;
}

type Props = ComponentPropsWithoutRef<'div'> & {
  balances: readonly WalletBalance[];
  prices: Readonly<Record<string, number | undefined>>;
};

const priorities = new Map<string, number>([
  ['Osmosis', 100], ['Ethereum', 50], ['Arbitrum', 30],
  ['Zilliqa', 20], ['Neo', 20],
]);
const amountFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });
const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function WalletPage({ balances, prices, children, ...rest }: Props) {
  const sortedBalances = useMemo(() => {
    return balances
      .map(balance => ({ balance, priority: priorities.get(balance.blockchain) ?? -99 }))
      .filter(({ balance, priority }) => priority > -99 && Number.isFinite(balance.amount) && balance.amount > 0)
      .sort((left, right) => right.priority - left.priority);
  }, [balances]);

  return (
    <div {...rest}>
      <ul aria-label="Wallet balances">
        {sortedBalances.map(({ balance }) => {
          const price = prices[balance.currency];
          const usdValue = typeof price === 'number' && Number.isFinite(price) && price >= 0
            ? price * balance.amount : null;
          return (
            <li key={balance.id}>
              <span>{balance.currency} · {balance.blockchain}</span>{' '}
              <span>{amountFormat.format(balance.amount)}</span>{' '}
              <span>{usdValue !== null && Number.isFinite(usdValue)
                ? usdFormat.format(usdValue) : 'Price unavailable'}</span>
            </li>
          );
        })}
      </ul>
      {children}
    </div>
  );
}
