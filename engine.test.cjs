/**
 * R0YAL Evidence Engine — full automated regression runner (CommonJS).
 * Run from the project root: node engine.test.cjs
 */
const { evaluateNearMissEvidence } = require('./engine.cjs');

function runRegressionSuite() {
  const tests = [
    {
      name: "Distinguishes 'a leg' from loss margin",
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Had a leg that lost by 20 points.' },
      expected: { status: 'TEXT_MARGIN_EXCEEDED', marginVerified: false, isNearMiss: false, unit: 'POINTS', marginValue: 20 }
    },
    {
      name: 'Ignore missing unit or non-margin quantities',
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Missed by 1.' },
      expected: { status: 'PROXIMITY_UNVERIFIED', marginVerified: false, isNearMiss: false }
    },
    {
      name: 'Rejects fractional legs in text fallback',
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Missed by 0.5 legs.' },
      expected: { status: 'PROXIMITY_UNVERIFIED', marginVerified: false, isNearMiss: false }
    },
    {
      name: 'Rejects malformed comma formatting',
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Lost by 1,0 points.' },
      expected: { status: 'PROXIMITY_UNVERIFIED', marginVerified: false, isNearMiss: false }
    },
    {
      name: 'Accepts valid thousands separator',
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Missed by 1,000 points.' },
      expected: { status: 'TEXT_MARGIN_EXCEEDED', marginVerified: false, isNearMiss: false, unit: 'POINTS', marginValue: 1000 }
    },
    {
      name: "Parses word-form numbers ('one')",
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Lost by one point.' },
      expected: { status: 'UNVERIFIED_TEXT_INDICATES_NEAR_MISS', marginVerified: false, isNearMiss: true, unit: 'POINTS', marginValue: 1 }
    },
    {
      name: 'Handles trailing punctuation correctly',
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Lost by 1 point.' },
      expected: { status: 'UNVERIFIED_TEXT_INDICATES_NEAR_MISS', marginVerified: false, isNearMiss: true, unit: 'POINTS', marginValue: 1 }
    },
    {
      name: 'Detects text margin exceeded',
      input: { candidate: { isCandidate: true, eventId: 'EVT_1' }, eventClauseText: 'Missed by 1.5 points.' },
      expected: { status: 'TEXT_MARGIN_EXCEEDED', marginVerified: false, isNearMiss: false, unit: 'POINTS', marginValue: 1.5 }
    },
    {
      name: 'Verified near miss with matching client/server metrics',
      input: {
        candidate: { isCandidate: true, eventId: 'EVT_100' },
        eventClauseText: '',
        incomingReceipt: { eventId: 'EVT_100', marginValue: 0.5, unit: 'POINTS' },
        trustedServerRecord: { eventId: 'EVT_100', isVerified: true, marginValue: 0.5, unit: 'POINTS' }
      },
      expected: { status: 'VERIFIED_NEAR_MISS', marginVerified: true, isNearMiss: true, unit: 'POINTS', marginValue: 0.5 }
    },
    {
      name: 'Blocks client/server metric discrepancy',
      input: {
        candidate: { isCandidate: true, eventId: 'EVT_100' },
        eventClauseText: '',
        incomingReceipt: { eventId: 'EVT_100', marginValue: 0.5, unit: 'POINTS' },
        trustedServerRecord: { eventId: 'EVT_100', isVerified: true, marginValue: 2.5, unit: 'POINTS' }
      },
      expected: { status: 'PAYLOAD_SERVER_METRIC_MISMATCH', marginVerified: false, isNearMiss: false }
    },
    {
      name: 'Blocks candidate/receipt event ID mismatch',
      input: {
        candidate: { isCandidate: true, eventId: 'EVT_100' },
        eventClauseText: '',
        incomingReceipt: { eventId: 'EVT_999', marginValue: 0.5, unit: 'POINTS' }
      },
      expected: { status: 'EVENT_IDENTITY_MISMATCH', marginVerified: false, isNearMiss: false }
    },
    {
      name: 'Rejects missing server record',
      input: {
        candidate: { isCandidate: true, eventId: 'EVT_100' },
        eventClauseText: '',
        incomingReceipt: { eventId: 'EVT_100', marginValue: 0.5, unit: 'POINTS' },
        trustedServerRecord: null
      },
      expected: { status: 'SERVER_VERIFICATION_RECORD_MISSING', marginVerified: false, isNearMiss: false }
    },
    {
      name: 'Rejects unverified server record',
      input: {
        candidate: { isCandidate: true, eventId: 'EVT_100' },
        eventClauseText: '',
        incomingReceipt: { eventId: 'EVT_100', marginValue: 0.5, unit: 'POINTS' },
        trustedServerRecord: { eventId: 'EVT_100', isVerified: false, marginValue: 0.5, unit: 'POINTS' }
      },
      expected: { status: 'SERVER_RECORD_UNVERIFIED', marginVerified: false, isNearMiss: false }
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, index) => {
    const result = evaluateNearMissEvidence(test.input);
    const statusMatch = result.status === test.expected.status;
    const verifiedMatch = result.marginVerified === test.expected.marginVerified;
    const nearMissMatch = result.isNearMiss === test.expected.isNearMiss;
    const evidenceMatch = !test.expected.unit || (
      result.evidence?.unit === test.expected.unit &&
      result.evidence?.marginValue === String(test.expected.marginValue)
    );

    if (statusMatch && verifiedMatch && nearMissMatch && evidenceMatch) {
      passed++;
    } else {
      failed++;
      console.error(`Test #${index + 1} failed: "${test.name}"`);
      console.error('Expected:', test.expected);
      console.error('Actual:', result);
    }
  });

  console.log(`\nRegression Results: ${passed} Passed | ${failed} Failed out of ${tests.length} test cases.`);
  if (failed > 0) {
    throw new Error(`[CI_FAILURE] Regression suite failed with ${failed} broken test cases.`);
  }
}

runRegressionSuite();