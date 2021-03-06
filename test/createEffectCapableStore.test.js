import { assert } from 'chai';
import { stub, spy } from 'sinon';
import { createStore } from 'redux';

import AppStateWithEffects from '../src/AppStateWithEffects';
import createEffectCapableStore, { wrapGetState, wrapDispatch } from '../src/createEffectCapableStore';

describe('Create effect capable store', () => {
  let store;

  beforeEach(() => {
    store = {
      getState: () => {},
      dispatch: () => {}
    };
  });

  it('should return the original app state when calling wrappedGetState method', () => {
    const appState =  'stub';
    stub(store, 'getState').returns(new AppStateWithEffects(appState, []));

    const wrapped = wrapGetState(store);
    assert.equal(wrapped(), appState);
  });

  it('should execute all the effects which are inside AppStateWithEffects', () => {
    const action = 'stub';
    const effect1 = spy();
    const effect2 = spy();

    spy(store, 'dispatch');
    stub(store, 'getState').returns(new AppStateWithEffects({}, [effect1, effect2]));

    const wrapped = wrapDispatch(store);
    wrapped(action);

    assert.isTrue(store.dispatch.calledWith(action));
  });

  it('should allow to pass only function as effect', () => {
    try {
      stub(store, 'getState').returns(new AppStateWithEffects({}, [false]));
      const wrapped = wrapDispatch(store);
      wrapped();
    } catch (ex) {
      assert.equal(ex.message, `Invariant violation: It's allowed to yield only functions (side effect)`);
    }
  });

  it('should allow to yield effect within action which has been dispatched through effect', () => {
    const effect1 = spy(dispatch => {
      if (effect1.callCount === 1) {
        dispatch();
      }
    });

    stub(store, 'getState').returns(new AppStateWithEffects({}, [effect1]));

    const wrappedDispatch = wrapDispatch(store);
    wrappedDispatch();

    assert.equal(effect1.callCount, 2);
  });

  it('should wrap the next reducer even when the replaceReducer is called', () => {
    function* testingReducer() {
      yield () => 1;
      return 1;
    }

    const testingStore = createEffectCapableStore(createStore)(testingReducer);
    testingStore.dispatch({type: 'test'});
    assert.isTrue(testingStore.liftGetState() instanceof AppStateWithEffects);

    testingStore.replaceReducer(testingReducer);
    assert.isTrue(testingStore.liftGetState() instanceof AppStateWithEffects);
  });
});
