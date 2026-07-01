'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Save, Building, Palette, Video, Link2, CheckCircle, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SettingsView() {
  const { currentInstitute, setCurrentInstitute } = useAppStore()
  const { toast } = useToast()

  // Institute Profile
  const [profile, setProfile] = useState({
    name: currentInstitute?.name || '',
    phone: currentInstitute?.phone || '',
    email: currentInstitute?.email || '',
    city: currentInstitute?.city || '',
    address: '',
    website: '',
  })

  // Zoom
  const [zoomConnected, setZoomConnected] = useState(currentInstitute?.zoomEnabled ?? false)
  const [zoomForm, setZoomForm] = useState({
    apiKey: '',
    apiSecret: '',
  })
  const [zoomSettings, setZoomSettings] = useState({
    waitingRoom: true,
    muteParticipants: true,
    autoRecord: false,
  })
  const [testing, setTesting] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingZoom, setSavingZoom] = useState(false)
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [savingDisplay, setSavingDisplay] = useState(false)

  // Features
  const [features, setFeatures] = useState({
    students: true,
    batches: true,
    attendance: true,
    fees: true,
    timetable: true,
    zoom: true,
    exams: true,
    messaging: false,
    recordings: true,
  })

  // Display
  const [display, setDisplay] = useState({
    dateFormat: 'dd/mm/yyyy',
    timeFormat: '12h',
    language: 'en',
    accentColor: 'emerald',
  })

  // Load settings from API on mount
  useEffect(() => {
    if (!currentInstitute) return
    fetch(`/api/settings?instituteId=${currentInstitute.id}`)
      .then((res) => {
        if (!res.ok) return
        return res.json()
      })
      .then((data: any[] | undefined) => {
        if (!data || !Array.isArray(data)) return
        for (const s of data) {
          if (s.group === 'features' && s.key in features) {
            setFeatures((prev) => ({ ...prev, [s.key]: s.value === 'true' }))
          }
          if (s.group === 'display' && s.key in display) {
            setDisplay((prev) => ({ ...prev, [s.key]: s.value }))
          }
          if (s.group === 'zoom' && s.key in zoomSettings) {
            setZoomSettings((prev) => ({ ...prev, [s.key]: s.value === 'true' }))
          }
        }
      })
      .catch(() => {})
  }, [currentInstitute])

  const handleSaveProfile = async () => {
    if (!currentInstitute) return
    setSavingProfile(true)
    try {
      const res = await fetch('/api/institute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          city: profile.city,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }
      setCurrentInstitute({
        ...currentInstitute!,
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        city: profile.city,
      })
      toast({ title: 'Profile updated', description: 'Institute profile saved successfully' })
    } catch (err: any) {
      toast({ title: 'Error saving profile', description: err.message, variant: 'destructive' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleTestZoom = async () => {
    if (!currentInstitute) return
    if (!zoomForm.apiKey || !zoomForm.apiSecret) {
      toast({ title: 'Missing credentials', description: 'Please enter API Key and API Secret first', variant: 'destructive' })
      return
    }
    setTesting(true)
    try {
      const res = await fetch('/api/zoom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          accountId: zoomForm.apiKey,
          clientId: zoomForm.apiKey,
          clientSecret: zoomForm.apiSecret,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Connection test failed')
      }
      setZoomConnected(true)
      setCurrentInstitute({ ...currentInstitute!, zoomEnabled: true })
      toast({ title: 'Connection successful!', description: 'Zoom API is working correctly' })
    } catch (err: any) {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  const handleConnectZoom = async () => {
    if (!currentInstitute) return
    if (!zoomForm.apiKey || !zoomForm.apiSecret) {
      toast({ title: 'Missing credentials', description: 'Please enter API Key and API Secret', variant: 'destructive' })
      return
    }
    setSavingZoom(true)
    try {
      const res = await fetch('/api/zoom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          accountId: zoomForm.apiKey,
          clientId: zoomForm.apiKey,
          clientSecret: zoomForm.apiSecret,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to connect Zoom')
      }
      setZoomConnected(true)
      setCurrentInstitute({ ...currentInstitute!, zoomEnabled: true })
      toast({ title: 'Zoom Connected!', description: 'Your Zoom account has been linked' })
    } catch (err: any) {
      toast({ title: 'Error connecting Zoom', description: err.message, variant: 'destructive' })
    } finally {
      setSavingZoom(false)
    }
  }

  const handleDisconnectZoom = async () => {
    if (!currentInstitute) return
    setSavingZoom(true)
    try {
      const res = await fetch(`/api/zoom/connect?instituteId=${currentInstitute.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect Zoom')
      }
      setZoomConnected(false)
      setCurrentInstitute({ ...currentInstitute!, zoomEnabled: false })
      toast({ title: 'Zoom Disconnected' })
    } catch (err: any) {
      toast({ title: 'Error disconnecting Zoom', description: err.message, variant: 'destructive' })
    } finally {
      setSavingZoom(false)
    }
  }

  const handleSaveFeatures = async () => {
    if (!currentInstitute) return
    setSavingFeatures(true)
    try {
      const settings: Record<string, { value: string; type: string; group: string }> = {}
      for (const [key, value] of Object.entries(features)) {
        settings[key] = { value: String(value), type: 'boolean', group: 'features' }
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instituteId: currentInstitute.id, settings }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save features')
      }
      toast({ title: 'Features saved', description: 'Feature settings updated' })
    } catch (err: any) {
      toast({ title: 'Error saving features', description: err.message, variant: 'destructive' })
    } finally {
      setSavingFeatures(false)
    }
  }

  const handleSaveDisplay = async () => {
    if (!currentInstitute) return
    setSavingDisplay(true)
    try {
      const settings: Record<string, { value: string; type: string; group: string }> = {}
      for (const [key, value] of Object.entries(display)) {
        settings[key] = { value: String(value), type: 'string', group: 'display' }
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instituteId: currentInstitute.id, settings }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save display settings')
      }
      toast({ title: 'Display settings saved' })
    } catch (err: any) {
      toast({ title: 'Error saving display settings', description: err.message, variant: 'destructive' })
    } finally {
      setSavingDisplay(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your institute settings and preferences</p>
      </div>

      <Tabs defaultValue="institute">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="institute" className="gap-1.5"><Building className="h-3.5 w-3.5" /> Institute</TabsTrigger>
          <TabsTrigger value="zoom" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Zoom</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="display" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Display</TabsTrigger>
        </TabsList>

        <TabsContent value="institute" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Institute Profile</CardTitle>
              <CardDescription>Basic information about your tuition centre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Institute Name</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City</Label><Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Website</Label><Input placeholder="https://..." value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zoom" className="mt-6">
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Video className="h-4 w-4" /> Zoom Integration
                    </CardTitle>
                    <CardDescription>Connect your Zoom account for online classes</CardDescription>
                  </div>
                  <Badge variant="outline" className={zoomConnected ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}>
                    {zoomConnected ? <><Wifi className="h-3 w-3 mr-1" /> Connected</> : <><WifiOff className="h-3 w-3 mr-1" /> Not Connected</>}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {zoomConnected ? (
                  <>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium text-sm">Zoom is connected and ready</span>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Your Zoom account is linked. You can create and manage meetings from the Online Classes section.
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleDisconnectZoom} disabled={savingZoom} className="text-destructive gap-2">
                      {savingZoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                      {savingZoom ? 'Disconnecting...' : 'Disconnect Zoom'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input placeholder="Enter your Zoom API Key" value={zoomForm.apiKey} onChange={(e) => setZoomForm({ ...zoomForm, apiKey: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>API Secret</Label>
                        <Input type="password" placeholder="Enter your Zoom API Secret" value={zoomForm.apiSecret} onChange={(e) => setZoomForm({ ...zoomForm, apiSecret: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleConnectZoom} disabled={savingZoom || testing} className="gap-2">
                        {savingZoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                        {savingZoom ? 'Connecting...' : 'Connect'}
                      </Button>
                      <Button variant="outline" onClick={handleTestZoom} disabled={savingZoom || testing}>
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {testing ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Zoom Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zoom Settings</CardTitle>
                <CardDescription>Default settings for new Zoom meetings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable Waiting Room</p>
                    <p className="text-xs text-muted-foreground">Students wait in a lobby before joining</p>
                  </div>
                  <Switch checked={zoomSettings.waitingRoom} onCheckedChange={(v) => setZoomSettings({ ...zoomSettings, waitingRoom: v })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mute Participants on Entry</p>
                    <p className="text-xs text-muted-foreground">Automatically mute students when they join</p>
                  </div>
                  <Switch checked={zoomSettings.muteParticipants} onCheckedChange={(v) => setZoomSettings({ ...zoomSettings, muteParticipants: v })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-Record Meetings</p>
                    <p className="text-xs text-muted-foreground">Start recording automatically when meeting starts</p>
                  </div>
                  <Switch checked={zoomSettings.autoRecord} onCheckedChange={(v) => setZoomSettings({ ...zoomSettings, autoRecord: v })} />
                </div>
                <Button onClick={async () => {
                  if (!currentInstitute) return
                  setSavingZoom(true)
                  try {
                    const settings: Record<string, { value: string; type: string; group: string }> = {}
                    for (const [key, value] of Object.entries(zoomSettings)) {
                      settings[key] = { value: String(value), type: 'boolean', group: 'zoom' }
                    }
                    const res = await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ instituteId: currentInstitute.id, settings }),
                    })
                    if (!res.ok) {
                      const data = await res.json()
                      throw new Error(data.error || 'Failed to save zoom settings')
                    }
                    toast({ title: 'Zoom settings saved' })
                  } catch (err: any) {
                    toast({ title: 'Error saving Zoom settings', description: err.message, variant: 'destructive' })
                  } finally {
                    setSavingZoom(false)
                  }
                }} disabled={savingZoom} className="gap-2">
                  {savingZoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingZoom ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Toggles</CardTitle>
              <CardDescription>Enable or disable features for your institute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(features).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(v) => setFeatures({ ...features, [key]: v })}
                  />
                </div>
              ))}
              <Separator />
              <Button onClick={handleSaveFeatures} disabled={savingFeatures} className="gap-2">
                {savingFeatures ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingFeatures ? 'Saving...' : 'Save Features'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Display Preferences</CardTitle>
              <CardDescription>Customize how TBOS looks for your institute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={display.dateFormat} onValueChange={(v) => setDisplay({ ...display, dateFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select value={display.timeFormat} onValueChange={(v) => setDisplay({ ...display, timeFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={display.language} onValueChange={(v) => setDisplay({ ...display, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="si">Sinhala (සිංහල)</SelectItem>
                      <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <Select value={display.accentColor} onValueChange={(v) => setDisplay({ ...display, accentColor: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emerald">Emerald</SelectItem>
                      <SelectItem value="teal">Teal</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveDisplay} disabled={savingDisplay} className="gap-2">
                {savingDisplay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingDisplay ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}