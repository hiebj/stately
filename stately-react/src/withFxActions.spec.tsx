import * as React from 'react'
import * as chai from 'chai'
import { shallow } from 'enzyme'
import 'mocha'
const { expect } = chai

import { withAsyncSessionManager, AsyncSessionManagerProps } from './withAsyncSessionManager'

const TestComponent: React.SFC<{ text: string } & AsyncSessionManagerProps<any, any>> = ({ text }) => (
  <div>{text}</div>
)

describe('withAsyncSessionManager(Component)', () => {
  it('should expose an `effect` prop, and inject a corresponding `fxActions` prop', () => {
    const effect = () => Promise.resolve(10)
    const WithAsyncSession = withAsyncSessionManager(TestComponent)
    const wrapper = shallow(<WithAsyncSession asyncFunction={effect} text={'this is a component'} />)
    expect(wrapper.props()).to.have.property('asyncSessionManager')
    expect(wrapper.props().asyncSessionManager).to.have.property('call')
    expect(wrapper.props().asyncSessionManager).to.have.property('destroy')
    expect(wrapper.props().asyncSessionManager).to.have.property('selector')
    expect(wrapper.props().asyncSessionManager.call('abc', 123)).to.deep.property('payload', ['abc', 123])
  })
})
