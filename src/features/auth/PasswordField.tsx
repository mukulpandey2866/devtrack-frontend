import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { IconButton } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'

export function PasswordField({
  label,
  error,
  hint,
  ...rest
}: { label: string; error?: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...rest}
      label={label}
      error={error}
      hint={hint}
      type={visible ? 'text' : 'password'}
      suffix={
        <IconButton
          label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="input-group__button"
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff className="icon" aria-hidden="true" /> : <Eye className="icon" aria-hidden="true" />}
        </IconButton>
      }
    />
  )
}
