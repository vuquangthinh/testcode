# Wallet component review

## Correctness and types

1. `lhsPriority` is undefined in the filter; it should be `balancePriority`. This prevents compilation (or throws at runtime).
2. `WalletBalance` omits `blockchain`, although both filtering and sorting read it. Declare it in the data contract. Avoid `any` in `getPriority`; an unknown chain can still be represented as a string with an explicit fallback.
3. The filter keeps zero and negative balances. Assuming this screen should show holdings, use `amount > 0`, and reject non-finite values. This is a product assumption, not an unconditional bug.
4. The sort comparator returns `undefined` for equal priorities. Return zero explicitly (or subtract priorities) for a well-defined numeric comparator. Equal priorities should retain input order.
5. `formattedBalances` is calculated but never consumed. Rows instead read `formatted` from unformatted balances; annotating the callback parameter cannot create that property.
6. An array index is an unstable React key when balances reorder, disappear, or arrive. Use an immutable balance ID from the data source. Currency alone is insufficient when multiple accounts/chains hold the same currency.
7. Missing/invalid prices produce `NaN` or misleading values. Represent unavailable valuation explicitly, not as zero.
8. `toFixed()` defaults to zero decimal places and hides fractional holdings. Use a deliberate display policy; a formatted string must never feed financial calculations.
9. `Props extends BoxProps` is spread onto a native div. Box-specific style/system props might not be valid DOM attributes. Use native div props or render the actual Box component.
10. `children` is removed and silently ignored. Render it or explicitly omit children from the public contract.

## Computation and rendering

- `prices` is an unnecessary dependency of sorting, causing filtering and O(n log n) sorting on every price update. Memoize holdings using only `balances`; valuation still updates during render.
- `getPriority` is recreated on every render and recomputed throughout comparisons. Hoist the pure lookup and decorate each balance with its priority once before sorting.
- Remove the unused formatting pass; format only the rows being rendered. Reuse an `Intl.NumberFormat` instance outside the component.
- `.filter(...).sort(...)` does **not** mutate the original balances: filter creates a new array. Mutation is not a bug here.
- Multiple linear passes alone are not necessarily a performance problem; sorting dominates. `useMemo` is an optimization, not correctness machinery. It depends on immutable replacement of the balances array.
- Memoizing every row or callback is not automatically beneficial. Profile first; consider virtualization only for very large wallets.

## Refactored version

`WalletPage.tsx` is a self-contained, typed presentation component with a row implementation. It receives balances and prices as props so it does not invent missing application imports. The original hooks can pass their results into this component from an application container. Add immutable balance IDs in that integration layer.

Display is limited to eight fractional digits; amounts below that precision may display as zero. Production asset-specific precision and decimal arithmetic belong in the domain/data layer. This illustrative component keeps the prompt's number-based amounts.
