const params = [0.125, -0.01125, 0.27, 1.3, 10, 0.6, 0.0115, 0.138, 0.006000000000001];

function formula(value)
{
  return value <= 0.006
    ? (8 * value) + 0.09
    : (0.27 * Math.log10((1.3 * value) + 0.0115)) + 0.6;
}

function generic(value)
{
  return value >= params[8]
    ? (params[2] * Math.log((value * params[3]) + params[6]) / Math.log(params[4])) + params[5]
    : (value - params[1]) / params[0];
}

const values = [0, 0.002, 0.006, 0.018, 0.18, 0.9, 4.07, 5.59, 8.15, 23.3];
const rows = values.map((value) =>
{
  const expected = formula(value);
  const received = generic(value);
  return {
    lsr: value,
    formula: Number(expected.toFixed(12)),
    generic: Number(received.toFixed(12)),
    delta: Number((received - expected).toExponential(3)),
    code10Full: Math.round(expected * 1023),
  };
});

console.log(JSON.stringify({ params, rows, ok: rows.every((row) => Math.abs(row.delta) < 1e-9) }, null, 2));
