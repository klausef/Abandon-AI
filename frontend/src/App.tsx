import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { MockAuthProvider } from './features/users/auth/MockAuthProvider'

function App() {
  return (
    <MockAuthProvider>
      <RouterProvider router={router} />
    </MockAuthProvider>
  )
}

export default App
