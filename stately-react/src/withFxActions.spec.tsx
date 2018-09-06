import * as React from 'react'
import * as chai from 'chai'
import { shallow } from 'enzyme'
import 'mocha'
const expect = chai.expect

import { withFxActions, FxActionsProps } from './withFxActions'

const TestComponent: React.SFC<{ text: string } & FxActionsProps<any, any>> = ({ text }) => (
  <div>{text}</div>
)

describe('withFxActions(Component)', () => {
  it('should inject an `fxActions` prop into the given component', () => {
    const effect = () => Promise.resolve(10)
    const WithFxActions = withFxActions(TestComponent)
    const wrapper = shallow(<WithFxActions effect={effect} text={'this is a component'} />)
    expect(wrapper.props()).to.have.property('fxActions')
    expect(wrapper.props().fxActions).to.have.property('call')
    expect(wrapper.props().fxActions).to.have.property('destroy')
    expect(wrapper.props().fxActions).to.have.property('selector')
    expect(wrapper.props().fxActions.call('abc', 123)).to.deep.property('payload', ['abc', 123])
  })
})