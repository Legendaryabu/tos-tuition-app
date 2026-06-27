'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Leaf } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function LoginView() {
  const { setActiveView, setCurrentUser, setCurrentInstitute } = useAppStore()
  const { toast } = useToast()

  // Login state
  const [loginEmail, setLoginEmail] = useState('owner@csa.lk')
  const [loginPassword, setLoginPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // Register state
  const [regInstituteName, setRegInstituteName] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regMobile, setRegMobile] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (res.ok) {
        const data = await res.json()
        const isSuperAdmin = data.user.type === 'super_admin'
        setCurrentUser({
          ...data.user,
          isSuperAdmin,
        })
        setCurrentInstitute(data.institute)
        if (isSuperAdmin && !data.institute) {
          setActiveView('super-admin')
        } else if (data.institute?.onboardingCompleted) {
          setActiveView('dashboard')
        } else {
          setActiveView('onboarding')
        }
        toast({ title: 'Welcome back!', description: 'Login successful' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({
          title: 'Login failed',
          description: err.error || 'Invalid email or password',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Connection error',
        description: 'Could not connect to server. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regInstituteName || !regName || !regEmail || !regPassword) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    setRegLoading(true)
    try {
      const nameParts = regName.trim().split(/\s+/)
      const firstName = nameParts[0] || 'New'
      const lastName = nameParts.slice(1).join(' ') || 'User'
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: regEmail,
          mobile: regMobile,
          password: regPassword,
          instituteName: regInstituteName,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
        setCurrentInstitute(data.institute)
        setActiveView('onboarding')
        toast({ title: 'Account created!', description: "Let's set up your institute" })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({
          title: 'Registration failed',
          description: err.error || 'Could not create account',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Connection error',
        description: 'Could not connect to server. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/90 via-primary to-emerald-700 text-primary-foreground flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Leaf className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">TBOS</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Tuition Business<br />Operating System
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-md">
            The complete management platform built for Sri Lankan tuition businesses. 
            Manage students, batches, fees, and online classes all in one place.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</div>
            <span>Register your tuition institute</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</div>
            <span>Set up your batches and students</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">3</div>
            <span>Start managing like a pro</span>
          </div>
        </div>

        <p className="text-primary-foreground/50 text-sm">
          Made with care for Sri Lankan educators
        </p>
      </div>

      {/* Right panel - forms */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">TBOS</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-0 shadow-sm">
                <form onSubmit={handleLogin}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription>
                      Sign in to your tuition management dashboard
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.lk"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Demo:</span>{' '}
                        owner@csa.lk / password123
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Super Admin: admin@tbos.lk / admin123
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loginLoading}>
                      {loginLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-0 shadow-sm">
                <form onSubmit={handleRegister}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Create your account</CardTitle>
                    <CardDescription>
                      Set up your tuition institute in minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-institute">Institute Name *</Label>
                      <Input
                        id="reg-institute"
                        placeholder="e.g., Sunrise Tuition Centre"
                        value={regInstituteName}
                        onChange={(e) => setRegInstituteName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Full Name *</Label>
                      <Input
                        id="reg-name"
                        placeholder="e.g., Chaminda Silva"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email *</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.lk"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-mobile">Mobile</Label>
                        <Input
                          id="reg-mobile"
                          placeholder="+94 77 xxx xxxx"
                          value={regMobile}
                          onChange={(e) => setRegMobile(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password *</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Min 8 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={regLoading}>
                      {regLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}