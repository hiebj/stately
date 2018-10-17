import { should, use } from 'chai'
import { configure } from 'enzyme'

import chaiEnzyme = require('chai-enzyme')
import Adapter = require('enzyme-adapter-react-16')
import sinon = require('sinon-chai')

configure({ adapter: new Adapter() })

use(sinon)
use(chaiEnzyme())

should()
