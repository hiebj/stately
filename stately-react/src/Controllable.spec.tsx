import 'mocha'
import { expect } from 'chai'
import { spy } from 'sinon'
import { mount } from 'enzyme'

import * as React from 'react'
import { Reducer, Action, Store, createStore, applyMiddleware } from 'redux'
import { Subject } from 'rxjs';

import { $toMiddleware, $toEvents, EventAPI } from 'stately-async/observables'

import { createControllableContext, ControllableContext, composeController } from './Controllable'
import { StoreConsumer } from './StoreConsumer';

interface ClassNameState { className: string }

const classNameReducer: Reducer<ClassNameState> = (state = { className: 'initial' }, action) =>
  action.type === 'CLASSNAME_SET' ? { className: action.className } : state

describe('<Controllable>', () => {
  let action$: Subject<Action>
  let eventAPI: EventAPI<Action>
  let context: ControllableContext<ClassNameState>

  const TestControllable: React.SFC = () =>
    <context.Controllable>
      {({ className }, dispatch) =>
        <div className={className}>
          <button
            onClick={
              () => dispatch({ type: 'CLASSNAME_SET', className: 'test' })
            }>
          </button>
        </div>}
    </context.Controllable>

  beforeEach(() => {
    action$ = new Subject<Action>()
    eventAPI = $toEvents(action$)
    context = createControllableContext(classNameReducer, $toMiddleware(action$))
  })

  describe('without a providing <Controller>', () => {
    it('should allow the given reducer to initialize state', () => {
      const wrapper = mount(<TestControllable />)
      expect(wrapper).to.have.descendants('.initial')
    })
  
    it('should use the reducer to manage state internally when actions are dispatched', () => {
      const wrapper = mount(<TestControllable />)
      expect(wrapper).to.have.descendants('.initial')
      wrapper.find('button').simulate('click')
      expect(wrapper).to.have.descendants('.test')
    })
  
    it('should integrate any given middleware into the dispatch pipeline', () => {
      const wrapper = mount(<TestControllable />)
      const actionSpy = spy()
      eventAPI.one(({ type }) => type === 'CLASSNAME_SET', actionSpy)
      wrapper.find('button').simulate('click')
      expect(actionSpy).to.have.been.calledOnce
    })
  })

  describe('with a providing <Controller>', () => {
    let testStore: Store<ClassNameState>

    const WithController: React.SFC = () =>
      <StoreConsumer store={testStore}>
        {(state, dispatch) =>
          <context.Controller state={state} dispatch={dispatch}>
            <div>
              <TestControllable />
            </div>
          </context.Controller>}
      </StoreConsumer>

    beforeEach(() => {
      testStore = createStore(classNameReducer, { className: 'store' }, applyMiddleware($toMiddleware(action$)))
    })

    it('should take the initial state provided by the <Controller>', () => {
      const wrapper = mount(<WithController />)
      expect(wrapper).to.have.descendants('.store')
    })
  
    it('should use the dispatcher provided by the <Controller>', () => {
      const wrapper = mount(<WithController />)
      wrapper.find('button').simulate('click')
      expect(wrapper).to.have.descendants('.test')
      expect(testStore.getState()).to.have.property('className', 'test')
    })

    describe('composeController(Parent, Controller)', () => {
      it('should use the dispatcher provided by the <Controller>', () => {
        const StoreController = composeController(StoreConsumer, context.Controller)
        const wrapper = mount(
          <StoreController store={testStore}>
            <TestControllable />
          </StoreController>
        )
        wrapper.find('button').simulate('click')
        expect(wrapper).to.have.descendants('.test')
        expect(testStore.getState()).to.have.property('className', 'test')
      })
    })
  })
})
