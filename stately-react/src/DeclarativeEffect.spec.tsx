import * as React from 'react'
import { createStore, applyMiddleware, compose, Store, AnyAction } from 'redux'
import { Provider } from 'react-redux'
import { fxReducer, fxMiddleware, FxSlice } from 'fx-state'
import { isFxAction, FxActionType } from 'fx-state/actions'

import * as chai from 'chai'
import { SinonFakeTimers, useFakeTimers } from 'sinon'
import { mount } from 'enzyme'
import 'mocha'
const expect = chai.expect

import { testMiddleware, AddTestActionListener } from './middleware.spec'
import { ContextDeclarativeEffect } from './DeclarativeEffect'

let clock: SinonFakeTimers
let testStore: Store<FxSlice>
let onNext: AddTestActionListener

const effect = (p1: number, p2: string) =>
  new Promise<{ r1: number; r2: string }>(resolve => {
    setTimeout(() => resolve({ r1: p1 + 1, r2: p2.toLowerCase() }), 10)
  })

const TestApp: React.SFC<{ params: [number, string] }> = ({ params }) => (
  <Provider store={testStore}>
    <ContextDeclarativeEffect effect={effect} params={params}>
      {state => (
        <div>
          {state.data
            ? [
                <span className="r1" key="r1">
                  {state.data.r1}
                </span>,
                <span className="r2" key="r2">
                  {state.data.r2}
                </span>,
              ]
            : state.status === 'active' && <span className="loading" />}
        </div>
      )}
    </ContextDeclarativeEffect>
  </Provider>
)

const isFxActionOfType = (type: FxActionType) => (action: AnyAction) =>
  isFxAction(action) && action.fx.fxType === type

const isCompleteAction = isFxActionOfType('complete')

describe('<DeclarativeEffect>', () => {
  beforeEach(() => {
    clock = useFakeTimers()
    const { onNext: on, middleware } = testMiddleware()
    onNext = on
    testStore = createStore(
      fxReducer,
      compose(
        applyMiddleware(fxMiddleware),
        applyMiddleware(middleware),
      ),
    )
  })

  afterEach(() => {
    clock.restore()
  })

  it('should call the effect on mount, and render spinner initially', () => {
    const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
    expect(wrapper).to.have.descendants('.loading')
  })

  it('should render data when effect resolves and store updates', done => {
    const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
    onNext(
      isCompleteAction,
      () => {
        wrapper.update()
        expect(wrapper.find('.r1')).to.have.text('2')
        expect(wrapper.find('.r2')).to.have.text('param')
        done()
      },
      done,
    )
    clock.next()
  })

  it('should call the effect when the params change, and render the spinner', done => {
    const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
    expect(wrapper).to.have.descendants('.loading')
    onNext(
      isCompleteAction,
      () => {
        wrapper.update()
        expect(wrapper.find('.r1')).to.have.text('2')
        expect(wrapper.find('.r2')).to.have.text('param')
        wrapper.setProps({ params: [2, 'OTHER'] })
        wrapper.update()
        expect(wrapper).to.have.descendants('.loading')
        onNext(
          isCompleteAction,
          () => {
            wrapper.update()
            expect(wrapper.find('.r1')).to.have.text('3')
            expect(wrapper.find('.r2')).to.have.text('other')
            done()
          },
          done,
        )
        clock.next()
      },
      done,
    )
    clock.next()
  })

  it('should destroy the state when the component unmounts', () => {
    const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
    wrapper.unmount()
    expect(Object.keys(testStore.getState().fx)).to.have.property('length', 0)
  })
})
