import assert from 'node:assert/strict';
import { APP_FEATURES } from '../src/feature-config.js';
import { createFeatureHost } from '../src/feature-host.js';

assert.deepEqual(APP_FEATURES, [], 'the public build must not enable private features');
assert.ok(Object.isFrozen(APP_FEATURES), 'feature configuration must be immutable');

const received = [];
const errors = [];
const feature = {
  id: 'test-observer',
  setup({ subscribe, services }) {
    assert.equal(services.answer(), 42);
    subscribe('case-started', (event) => received.push(event));
    subscribe('case-started', () => {
      throw new Error('isolated listener failure');
    });
  },
};
const host = createFeatureHost([feature], {
  onError: (error, featureId) => errors.push({ error, featureId }),
});
host.start({ answer: () => 42 });
host.publish('case-started', { caseId: 'CASE-1' });

assert.deepEqual(host.featureIds, ['test-observer']);
assert.equal(received.length, 1);
assert.equal(received[0].type, 'case-started');
assert.deepEqual(received[0].detail, { caseId: 'CASE-1' });
assert.ok(Object.isFrozen(received[0]));
assert.ok(Object.isFrozen(received[0].detail));
assert.equal(errors.length, 1, 'one feature failure must not stop other listeners');
assert.equal(errors[0].featureId, 'test-observer');
assert.throws(() => host.start({}), /already started/i);
assert.throws(
  () => createFeatureHost([{ id: 'duplicate', setup() {} }, { id: 'duplicate', setup() {} }]),
  /unique/i,
);
assert.throws(() => createFeatureHost([{ id: '', setup() {} }]), /non-empty id/i);

console.log('OK — optional feature boundary validated.');
