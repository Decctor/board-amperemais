import { LoadingButton } from '@/components/loading-button'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { getErrorMessage } from '@/lib/errors'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/router'
import React, { FormEvent, use, useState } from 'react'
import { toast } from 'sonner'

function LoginPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  })
  async function login() {
    try {
      const { data } = await axios.post('/api/auth/login', credentials)
      if (!!data.success) await router.push('/')
      toast.success('Login efetuado com sucesso')
      return
    } catch (error) {
      throw error
    }
  }

  const { mutate, isPending } = useMutation({
    mutationKey: ['login'],
    mutationFn: login,
    onError(error, variables, context) {
      const msg = getErrorMessage(error)
      toast.error(msg, { position: 'top-center' })
    },
  })
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formElement = e.target as HTMLFormElement
    const response = await fetch(formElement.action, {
      method: formElement.method,
      body: JSON.stringify(Object.fromEntries(new FormData(formElement).entries())),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (response.ok) {
      router.push('/')
    }
  }
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Acesso a Dashboard Ampère+</CardTitle>
          <CardDescription>Acesse ao Dashboard validando sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutate()
            }}
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                id="username"
                placeholder="meuusuario@"
                autoComplete="email"
                name="username"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="********"
              />
            </div>

            <LoadingButton loading={isPending} className="w-full" aria-label="submit-btn">
              Acessar
            </LoadingButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
