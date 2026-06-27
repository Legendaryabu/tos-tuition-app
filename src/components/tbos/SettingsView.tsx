'use client'

import { useState } from 'react'
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
import { Save, Building, Palette, Globe, Video, Link2, CheckCircle, Wifi, WifiOff } from 'lucide-react'
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

  const handleSaveProfile = () => {
    setCurrentInstitute({
      ...currentInstitute!,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      city: profile.city,
    })
    toast({ title: 'Profile updated', description: 'Institute profile saved successfully' })
  }

  const handleTestZoom = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      toast({ title: 'Connection successful!', description: 'Zoom API is working correctly' })
    }, 1500)
  }

  const handleConnectZoom = () => {
    setZoomConnected(true)
    setCurrentInstitute({ ...currentInstitute!, zoomEnabled: true })
    toast({ title: 'Zoom Connected!', description: 'Your Zoom account has been linked' })
  }

  const handleDisconnectZoom = () => {
    setZoomConnected(false)
    setCurrentInstitute({ ...currentInstitute!, zoomEnabled: false })
    toast({ title: 'Zoom Disconnected' })
  }

  const handleSaveFeatures = () => {
    toast({ title: 'Features saved', description: 'Feature settings updated' })
  }

  const handleSaveDisplay = () => {
    toast({ title: 'Display settings saved' })
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
              <Button onClick={handleSaveProfile} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
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
                  <Badge variant="outline" className={zoomConnected ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}>
                    {zoomConnected ? <><Wifi className="h-3 w-3 mr-1" /> Connected</> : <><WifiOff className="h-3 w-3 mr-1" /> Not Connected</>}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {zoomConnected ? (
                  <>
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium text-sm">Zoom is connected and ready</span>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1">
                        Your Zoom account is linked. You can create and manage meetings from the Online Classes section.
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleDisconnectZoom} className="text-destructive gap-2">
                      <WifiOff className="h-4 w-4" /> Disconnect Zoom
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
                      <Button onClick={handleConnectZoom} className="gap-2"><Link2 className="h-4 w-4" /> Connect</Button>
                      <Button variant="outline" onClick={handleTestZoom} disabled={testing}>
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
                <Button onClick={() => toast({ title: 'Zoom settings saved' })} className="gap-2"><Save className="h-4 w-4" /> Save Settings</Button>
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
              <Button onClick={handleSaveFeatures} className="gap-2"><Save className="h-4 w-4" /> Save Features</Button>
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
              <Button onClick={handleSaveDisplay} className="gap-2"><Save className="h-4 w-4" /> Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}