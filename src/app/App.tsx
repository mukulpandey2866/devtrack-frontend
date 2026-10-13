import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from '../components/ui/ToastProvider'
import { AuthProvider } from '../features/auth/AuthProvider'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
