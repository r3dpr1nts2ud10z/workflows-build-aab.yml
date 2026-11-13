'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseScaledMargin: parse,
  formatScaledMargin: format,
  MAX_INPUT_LENGTH,
  SCALE
} = require('./evidence-decimal.cjs');
const repository = require('./evidence-repository.cjs');
const { evaluateNearMissEvidence: evaluate, validateStrictMargin } = require('./engine.cjs');

for (const [name, input, expected] of [
  ['zero', '0', 0n],
  ['zero fractional padding', '0.0000000', 0n],
  ['one fractional padding', '1.0000000', 1000000n],
  ['fractional padding', '1.2300000000', 1230000n],
  ['exponent padding', '10000000000000000e-16', 1000000n],
  ['scientific fraction', '1e-6', 1n],
  ['leading dot', '.50000000', 500000n],
  ['positive sign', '+1.5e0', 1500000n],
  ['whitespace', ' 16.000001 ', 16000001n],
  ['native six-place decimal', 16.000001, 16000001n],
  ['string six-place decimal', '16.000001', 16000001n],
  ['large exact decimal', '9007199254.740993', 9007199254740993n],
  ['unsafe integer supplied as string', '9007199254740993', 9007199254740993000000n],
  ['bounded positive exponent', '1e100', 10n ** 106n],
  ['zero with bounded negative exponent', '0e-100', 0n]
]) {
  test(`exact parser: ${name}`, () => {
    assert.equal(parse(input), expected);
    assert.equal(parse(format(expected)), expected);
  });
}

for (const [name, input] of [
  ['plain threshold bypass', '1.0000000000000001'],
  ['scientific threshold bypass', '10000000000000001e-16'],
  ['underflow', '1e-999'],
  ['negative underflow', '-1e-999'],
  ['small scientific fraction', '1e-11'],
  ['small decimal fraction', '0.00000000001'],
  ['seventh decimal', '1e-7'],
  ['native seventh decimal', 1e-7],
  ['negative string zero', '-0.0000000'],
  ['native negative zero', -0],
  ['NaN', NaN],
  ['infinity', Infinity],
  ['negative', -1],
  ['boolean', false],
  ['object', {}],
  ['array', []],
  ['null', null],
  ['undefined', undefined],
  ['BigInt with ambiguous scale', 1n],
  ['empty', ''],
  ['whitespace only', '  '],
  ['malformed exponent', '1e+'],
  ['hex notation', '0x10'],
  ['SQL-like input', '1; DROP TABLE verified_receipts;'],
  ['unsafe native integer', Number.MAX_SAFE_INTEGER + 1],
  ['positive exponent beyond cap', '1e101'],
  ['negative exponent beyond cap even for zero', '0e-101'],
  ['huge exponent inside length cap', '1e' + '9'.repeat(200)],
  ['huge exponent outside length cap', '1e' + '9'.repeat(400)],
  ['oversized coefficient', '9'.repeat(MAX_INPUT_LENGTH + 1)],
  ['whitespace cannot evade raw length cap', ' '.repeat(MAX_INPUT_LENGTH) + '1'],
  ['magnitude beyond scaled digit cap', '9'.repeat(115)]
]) {
  test(`reject safely: ${name}`, () => assert.equal(parse(input), null));
}

test('resource caps include exact boundaries', () => {
  assert.equal(parse('0'.repeat(MAX_INPUT_LENGTH)), 0n);
  const maximum = '9'.repeat(114) + '.999999';
  assert.equal(parse(maximum), 10n ** 120n - 1n);
  assert.equal(format(parse(maximum)), maximum);
});

test('formatter never emits BigInt into JSON', () => {
  assert.equal(JSON.stringify({ margin: format(9007199254740993n) }),
    '{"margin":"9007199254.740993"}');
  assert.throws(() => format(-1n), TypeError);
  assert.throws(() => format(1), TypeError);
});

function assess(serverMargin, clientMargin = serverMargin, unit = 'POINTS') {
  return evaluate({
    candidate: { isCandidate: true, eventId: 'E' },
    incomingReceipt: { eventId: 'E', marginValue: clientMargin, unit },
    trustedServerRecord: { eventId: 'E', isVerified: true, marginValue: serverMargin, unit }
  });
}

test('large unequal values cannot collide in client/server comparison', () => {
  assert.equal(assess('9007199254.740993', '9007199254.740992').status,
    'PAYLOAD_SERVER_METRIC_MISMATCH');
  const equal = assess('9007199254.740993');
  assert.equal(equal.status, 'VERIFIED_MARGIN_EXCEEDED');
  assert.equal(equal.evidence.marginValue, '9007199254.740993');
  assert.doesNotThrow(() => JSON.stringify(equal));
});

test('all threshold decisions are exact at and around the boundary', () => {
  for (const [unit, below, at, above, threshold] of [
    ['POINTS', '0.999999', '1', '1.000001', '1'],
    ['PERCENTAGE', '0.009999', '0.01', '0.010001', '0.01'],
    ['LEGS', '0', '1', '2', '1']
  ]) {
    for (const value of [below, at]) {
      const result = assess(value, value, unit);
      assert.equal(result.status, 'VERIFIED_NEAR_MISS');
      assert.equal(result.evidence.threshold, threshold);
    }
    assert.equal(assess(above, above, unit).status, 'VERIFIED_MARGIN_EXCEEDED');
  }
  assert.equal(validateStrictMargin('0.5', 'LEGS').valid, false);
});

test('unsupported precision fails closed on both client and server', () => {
  for (const bad of ['1.0000000000000001', '10000000000000001e-16', '1e-999']) {
    assert.equal(assess(bad, '1').status, 'INVALID_SERVER_RECORD');
    assert.equal(assess('1', bad).status, 'INVALID_CLIENT_PAYLOAD');
  }
});

test('equivalent decimal representations and aliases match', () => {
  const result = evaluate({
    candidate: { isCandidate: true, eventId: 'E' },
    incomingReceipt: { eventId: 'E', marginValue: '1000000e-6', unit: 'pt' },
    trustedServerRecord: { eventId: 'E', isVerified: true, marginValue: '1.0000000', unit: 'POINTS' }
  });
  assert.equal(result.status, 'VERIFIED_NEAR_MISS');
  assert.deepEqual(result.evidence, { unit: 'POINTS', marginValue: '1', threshold: '1' });
});

test('text remains unverified and never rounds before evaluation', () => {
  const candidate = { isCandidate: true, eventId: 'E' };
  const result = evaluate({ candidate, eventClauseText: 'Lost by 9007199254.740993 points.' });
  assert.equal(result.evidence.marginValue, '9007199254.740993');
  assert.equal(result.status, 'TEXT_MARGIN_EXCEEDED');
  assert.equal(result.marginVerified, false);
  assert.equal(evaluate({ candidate, eventClauseText: 'Lost by 1.0000000000000001 points.' }).status,
    'PROXIMITY_UNVERIFIED');
});

test('deterministic fixed-point round trips and comparisons across magnitudes', () => {
  for (let index = 0n; index < 500n; index++) {
    const whole = index ** 7n;
    const fractional = (index * 7919n) % SCALE;
    const decimal = `${whole}.${fractional.toString().padStart(6, '0')}`;
    const exact = whole * SCALE + fractional;
    assert.equal(parse(decimal), exact);
    assert.equal(parse(format(exact)), exact);
    assert.equal(assess(decimal, format(exact + 1n)).status, 'PAYLOAD_SERVER_METRIC_MISMATCH');
  }
});

function fakeDb(row) {
  return {
    async query(sql, parameters) {
      assert.match(sql, /WHERE event_id = \$1 AND owner_id = \$2/);
      assert.deepEqual(parameters, ['E', 'fixture-user']);
      return { rows: row === null ? [] : [row] };
    }
  };
}

test('repository-to-engine pipeline preserves exact decimal strings', async () => {
  const candidate = await repository.fetchCandidateAndClauseFromDB(fakeDb({
    event_id: 'E', is_candidate: 'true', clause_text: 'Lost by one point.'
  }), 'E', 'fixture-user');
  const record = await repository.fetchTrustedServerRecordFromDB(fakeDb({
    event_id: 'E', is_verified: true, margin_value: '9007199254.740993000', unit: 'pt'
  }), 'E', 'fixture-user');
  assert.equal(record.marginValue, '9007199254.740993');
  assert.equal(evaluate({
    candidate, trustedServerRecord: record,
    incomingReceipt: { eventId: 'E', marginValue: '9007199254.740992', unit: 'POINTS' }
  }).status, 'PAYLOAD_SERVER_METRIC_MISMATCH');
  assert.equal(repository.parseStrictDbMargin('1.0000000'), 1000000n);
});

test('repository rejects corrupt flags, IDs, margins, units and duplicate rows', async () => {
  const valid = { event_id: 'E', is_verified: true, margin_value: '0.5', unit: 'POINTS' };
  for (const patch of [
    { event_id: {} }, { event_id: 'OTHER' }, { is_verified: 'yes' },
    { margin_value: null }, { margin_value: '1e999' }, { unit: 'NOPE' },
    { margin_value: '0.5', unit: 'LEGS' }
  ]) {
    await assert.rejects(repository.fetchTrustedServerRecordFromDB(
      fakeDb({ ...valid, ...patch }), 'E', 'fixture-user'
    ), { code: 'CORRUPT_DATABASE_RECORD' });
  }
  for (const result of [null, {}, { rows: [valid, valid] }]) {
    await assert.rejects(repository.fetchTrustedServerRecordFromDB(
      { query: async () => result }, 'E', 'fixture-user'
    ), { code: 'CORRUPT_DATABASE_RECORD' });
  }
});

test('missing records, false verification and database outages stay distinct', async () => {
  assert.equal(await repository.fetchCandidateAndClauseFromDB(fakeDb(null), 'E', 'fixture-user'), null);
  assert.equal(await repository.fetchTrustedServerRecordFromDB(fakeDb(null), 'E', 'fixture-user'), null);
  const record = await repository.fetchTrustedServerRecordFromDB(fakeDb({
    event_id: 'E', is_verified: 'false', margin_value: '0.5', unit: 'POINTS'
  }), 'E', 'fixture-user');
  assert.equal(record.isVerified, false);
  assert.equal(evaluate({
    candidate: { isCandidate: true, eventId: 'E' },
    incomingReceipt: { eventId: 'E', marginValue: '0.5', unit: 'POINTS' },
    trustedServerRecord: record
  }).status, 'SERVER_RECORD_UNVERIFIED');
  const outage = new Error('simulated outage');
  await assert.rejects(repository.fetchTrustedServerRecordFromDB({
    query: async () => { throw outage; }
  }, 'E', 'fixture-user'), error => error === outage);
});

test('invalid identities are rejected before database queries', async () => {
  for (const id of [null, undefined, {}, ['E'], false, 0, 'null', '', 'x'.repeat(257)]) {
    assert.equal(repository.parseStrictDbId(id), null);
    await assert.rejects(repository.fetchCandidateAndClauseFromDB({
      query() { assert.fail('must not query'); }
    }, id, 'fixture-user'), TypeError);
  }
});