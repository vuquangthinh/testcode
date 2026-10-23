// Fixed demo data: the request did not include the referenced price/image URLs.
const tokens = [
  { symbol: 'ETH', price: 3200, balance: 2.5 },
  { symbol: 'USDC', price: 1, balance: 5000 },
  { symbol: 'BTC', price: 64000, balance: 0.15 },
  { symbol: 'SOL', price: 145, balance: 30 },
  { symbol: 'ATOM', price: 8, balance: 250 },
];
const $ = id => document.getElementById(id);
const from = $('from-token');
const to = $('to-token');
const amount = $('input-amount');
const status = $('swap-status');
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });
let busy = false;
for (const token of tokens) {
  from.add(new Option(token.symbol, token.symbol));
  to.add(new Option(token.symbol, token.symbol));
}
to.value = 'USDC';
const selected = select => tokens.find(token => token.symbol === select.value);

function quote() {
  const source = selected(from);
  const target = selected(to);
  const raw = amount.value.trim();
  const value = Number(raw);
  let error = '';
  if (!/^\d+(?:\.\d{1,8})?$/.test(raw) || !Number.isFinite(value) || value <= 0) {
    error = 'Enter a positive amount with up to 8 decimal places.';
  } else if (source.symbol === target.symbol) {
    error = 'Choose two different currencies.';
  } else if (value > source.balance) {
    error = `Your demo balance is ${number.format(source.balance)} ${source.symbol}.`;
  }
  const fee = value * 0.003;
  const output = (value - fee) * source.price / target.price;
  if (!error && output < 0.00000001) error = 'Amount is too small for the displayed precision.';
  return { source, target, value, fee, output, error };
}

function render() {
  const q = quote();
  $('balance').textContent = `Balance: ${number.format(q.source.balance)}`;
  $('rate').textContent = `1 ${q.source.symbol} ≈ ${number.format(q.source.price / q.target.price)} ${q.target.symbol}`;
  $('amount-error').textContent = q.error;
  amount.setAttribute('aria-invalid', String(Boolean(q.error)));
  $('output-amount').value = q.error ? '—' : number.format(q.output);
  $('send-value').textContent = q.error ? '—' : usd.format(q.value * q.source.price);
  $('receive-value').textContent = q.error ? '—' : usd.format(q.output * q.target.price);
  $('fee').textContent = q.error ? '—' : `${number.format(q.fee)} ${q.source.symbol}`;
  $('submit-button').disabled = Boolean(q.error) || busy;
}
for (const element of [amount, from, to]) {
  element.addEventListener('input', () => { status.textContent = ''; render(); });
}
$('max-button').addEventListener('click', () => {
  amount.value = String(selected(from).balance);
  status.textContent = '';
  render();
});
$('reverse-button').addEventListener('click', () => {
  const previous = from.value;
  from.value = to.value;
  to.value = previous;
  status.textContent = '';
  render();
});
$('swap-form').addEventListener('submit', async event => {
  event.preventDefault();
  const q = quote();
  if (busy || q.error) { render(); return; }
  busy = true;
  $('swap-fields').disabled = true;
  $('swap-form').setAttribute('aria-busy', 'true');
  $('submit-button').textContent = 'Preparing preview…';
  status.textContent = 'Calculating your demo swap…';
  render();
  try {
    await new Promise(resolve => setTimeout(resolve, 750));
    status.textContent = `Preview ready: ${number.format(q.value)} ${q.source.symbol} → ${number.format(q.output)} ${q.target.symbol}. No funds moved.`;
  } finally {
    busy = false;
    $('swap-fields').disabled = false;
    $('swap-form').setAttribute('aria-busy', 'false');
    $('submit-button').textContent = 'Preview swap ↗';
    render();
    $('submit-button').focus();
  }
});
render();
