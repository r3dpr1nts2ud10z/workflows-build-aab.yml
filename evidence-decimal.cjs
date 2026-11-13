'use strict';

// Resource limits are checked before regex work, exponent parsing or BigInt work.
const MAX_INPUT_LENGTH = 256;
const MAX_EXPONENT = 100;
const DECIMAL_PLACES = 6;
const SCALE = 1000000n;
const MAX_SCALED_DIGITS = 120;

/**
 * Returns millionths as BigInt, or null. Never rounds.
 * Use decimal strings for lossless database/JSON transport. Legacy numbers are
 * interpreted as their existing JS value; precision lost upstream is unrecoverable.
 */
function parseScaledMargin(value) {
  let raw;
  if (typeof value === 'string') {
    if (value.length > MAX_INPUT_LENGTH) return null;
    raw = value.trim();
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || Object.is(value, -0) ||
        value > Number.MAX_SAFE_INTEGER) return null;
    raw = value.toString();
  } else {
    return null;
  }
  if (!raw || raw.length > MAX_INPUT_LENGTH) return null;

  // No negative sign, including negative zero.
  const match = /^\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match) return null;
  const integer = match[1] || '';
  const fraction = match[2] ?? match[3] ?? '';
  const exponentToken = match[4] || '0';
  const exponentDigits = exponentToken.replace(/^[+-]/, '').replace(/^0+/, '') || '0';
  // At most three exponent digits are converted, never an unbounded number.
  if (exponentDigits.length > 3) return null;
  const exponentMagnitude = Number(exponentDigits);
  if (exponentMagnitude > MAX_EXPONENT) return null;
  const exponent = exponentToken.startsWith('-') ? -exponentMagnitude : exponentMagnitude;

  let coefficient = (integer + fraction).replace(/^0+/, '');
  // Zero fits the scale at every permitted exponent.
  if (!coefficient) return 0n;
  let adjustment = DECIMAL_PLACES + exponent - fraction.length;
  const withoutTrailingZeros = coefficient.replace(/0+$/, '');
  adjustment += coefficient.length - withoutTrailingZeros.length;
  coefficient = withoutTrailingZeros;
  if (adjustment < 0) return null;
  // Also bounds both BigInt construction and the power operation.
  if (coefficient.length + adjustment > MAX_SCALED_DIGITS) return null;
  return BigInt(coefficient) * (10n ** BigInt(adjustment));
}

/** JSON-safe exact decimal formatting using integer division/remainder only. */
function formatScaledMargin(scaled) {
  if (typeof scaled !== 'bigint' || scaled < 0n) {
    throw new TypeError('Expected nonnegative scaled BigInt');
  }
  const integer = scaled / SCALE;
  const fraction = (scaled % SCALE).toString().padStart(DECIMAL_PLACES, '0').replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer.toString();
}

module.exports = {
  parseScaledMargin,
  formatScaledMargin,
  MAX_INPUT_LENGTH,
  MAX_EXPONENT,
  MAX_SCALED_DIGITS,
  DECIMAL_PLACES,
  SCALE
};