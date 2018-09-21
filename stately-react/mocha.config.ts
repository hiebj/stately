import * as chai from 'chai'
import * as sinon from 'sinon-chai'
import chaiEnzyme = require('chai-enzyme')
import Adapter = require('enzyme-adapter-react-16')
import { configure } from 'enzyme'

configure({ adapter: new Adapter() })

chai.use(sinon)
chai.use(chaiEnzyme())

chai.should()
