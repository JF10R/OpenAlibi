function validateFeatures(features) {
  if (!Array.isArray(features)) throw new TypeError('Features must be an array.');
  const ids = new Set();
  for (const feature of features) {
    if (!feature || typeof feature.id !== 'string' || !feature.id.trim()) {
      throw new TypeError('Each feature needs a non-empty id.');
    }
    if (ids.has(feature.id)) throw new TypeError('Feature ids must be unique.');
    if (typeof feature.setup !== 'function') {
      throw new TypeError(`Feature ${feature.id} needs a setup function.`);
    }
    ids.add(feature.id);
  }
}

export function createFeatureHost(features = [], options = {}) {
  validateFeatures(features);
  const installedFeatures = Object.freeze([...features]);
  const featureIds = Object.freeze(installedFeatures.map((feature) => feature.id));
  const listeners = new Map();
  const onError = typeof options.onError === 'function' ? options.onError : console.error;
  let started = false;

  function subscribe(featureId, type, listener) {
    if (typeof type !== 'string' || !type.trim()) throw new TypeError('Event type is required.');
    if (typeof listener !== 'function') throw new TypeError('Event listener must be a function.');
    const eventListeners = listeners.get(type) ?? new Set();
    const subscription = Object.freeze({ featureId, listener });
    eventListeners.add(subscription);
    listeners.set(type, eventListeners);
    return () => eventListeners.delete(subscription);
  }

  function start(services = {}) {
    if (started) throw new Error('Feature host already started.');
    started = true;
    const featureServices = Object.freeze({ ...services });
    for (const feature of installedFeatures) {
      try {
        feature.setup(Object.freeze({
          services: featureServices,
          subscribe: (type, listener) => subscribe(feature.id, type, listener),
        }));
      } catch (error) {
        onError(error, feature.id);
      }
    }
  }

  function publish(type, detail = {}) {
    if (!started) throw new Error('Feature host must be started before publishing.');
    const event = Object.freeze({ type, detail: Object.freeze({ ...detail }) });
    for (const subscription of listeners.get(type) ?? []) {
      try {
        const pending = subscription.listener(event);
        if (pending && typeof pending.catch === 'function') {
          pending.catch((error) => onError(error, subscription.featureId));
        }
      } catch (error) {
        onError(error, subscription.featureId);
      }
    }
  }

  return Object.freeze({ featureIds, publish, start });
}
