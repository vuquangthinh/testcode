// The sum over 1..n is empty when n <= 0.
function validate(n) {
  if (!Number.isSafeInteger(n)) throw new TypeError('n must be a safe integer');
}

// O(n) time, O(1) space: accumulate each term.
var sum_to_n_a = function (n) {
  validate(n);
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
};

// O(1) time and space: divide before multiplying to avoid a large intermediate.
var sum_to_n_b = function (n) {
  validate(n);
  if (n <= 0) return 0;
  return n % 2 === 0 ? (n / 2) * (n + 1) : n * ((n + 1) / 2);
};

// O(log n) time and stack: S(2k) = 2*S(k) + k*k.
/**
 * Calculates the sum from 1 to n with O(log n) time complexity.
 * 
 * Visual representation of splitting the sequence (for k = half):
 * Sequence: [1] [2] [3] [4]  --> half = 2
 *           *   * *   * * *   * * * *
 *           -- Half 1 --  ---- Half 2 ----
 *           Half 2 splits into: [Square k*k] + [Copy of Half 1]
 *           Formula: S(2k) = 2 * S(k) + k * k
 */
var sum_to_n_c = function (n) {
  validate(n);
  function sum(value) {
    if (value <= 0) return 0;
    const half = Math.floor(value / 2);
    const evenSum = 2 * sum(half) + half * half;
    return value % 2 === 0 ? evenSum : evenSum + value;
  }
  return sum(n);
};

module.exports = { sum_to_n_a, sum_to_n_b, sum_to_n_c };
