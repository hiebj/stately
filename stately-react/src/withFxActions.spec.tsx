import * as React from 'react'
import * as chai from 'chai'
import { shallow } from 'enzyme'
import 'mocha'
const expect = chai.expect

import { withFxActions } from './withFxActions'

describe('withFxActions(Component)', () => {
  it('should inject an `fxActions` prop into the given component', () => {
    const wrappedComponent = ({ text }: { text: string }) => (
      <div>{text}</div>
    )
    const effect = () => Promise.resolve(10)
    const WithFxActions = withFxActions(wrappedComponent, effect)
    const wrapper = shallow(
      <WithFxActions text={'this is a component'} />
    )
    expect(wrapper.props()).to.have.property('fxActions')
    expect(wrapper.props().fxActions).to.have.property('call')
    expect(wrapper.props().fxActions).to.have.property('destroy')
    expect(wrapper.props().fxActions).to.have.property('selector')
  })
})
