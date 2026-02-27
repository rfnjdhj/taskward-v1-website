import { lazy } from 'react'

const Home = lazy(() => import('./Home'))
const Note = lazy(() => import('./Note'))
const Archive = lazy(() => import('./Archive'))
const Trash = lazy(() => import('./Trash'))
const Statistics = lazy(() => import('./Statistics'))
const NotFound = lazy(() => import('./NotFound'))
const Icons = lazy(() => import('./Icons'))

import Login from './Login'
import Signup from './Signup'

export { Home, Note, Archive, Trash, Statistics, NotFound, Login, Signup, Icons }
