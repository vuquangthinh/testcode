# Summation

Three implementations are exported from `solution.js`: iteration, arithmetic formula, and recursive halving. All return `15` for `5` and `0` for `0`.

The prompt does not define negative input. This solution treats `1..n` as an empty range for `n <= 0`, returning zero. Non-integers and unsafe integers are rejected. As specified, the resulting sum must be less than `Number.MAX_SAFE_INTEGER`.

| Implementation | Time | Auxiliary space |
| --- | --- | --- |
| `sum_to_n_a` | O(n) | O(1) |
| `sum_to_n_b` | O(1) | O(1) |
| `sum_to_n_c` | O(log n) | O(log n) |

The formula is the practical choice for large inputs. Recursive halving demonstrates a third approach without a linear-depth call stack or allocating an array of n elements.
