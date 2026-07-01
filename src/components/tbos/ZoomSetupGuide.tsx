'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Monitor,
  Key,
  Plug,
  Rocket,
  Download,
  FolderOpen,
  Terminal,
  Globe,
  Shield,
  Video,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SetupGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const codeBlocks: Record<string, string> = {
  envFile: `# .env file - Create this in your project root

# Zoom Server-to-Server OAuth Credentials
ZOOM_ACCOUNT_ID=your_zoom_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# Optional: OAuth Redirect URI (for future user-level OAuth)
ZOOM_REDIRECT_URI=http://localhost:3000/api/zoom/callback`,

  install: `# 1. Create a new project folder
mkdir my-tuition-app
cd my-tuition-app

# 2. Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --app

# 3. Install dependencies
npm install zustand @prisma/client
npm install -D prisma

# 4. Initialize Prisma (PostgreSQL / Neon)
npx prisma init --datasource-provider postgresql

# 5. Set DATABASE_URL in .env to your Neon connection string

# 6. Copy the prisma/schema.prisma from this project
# 7. Push schema to database
npx prisma db push

# 8. Start the development server
npm run dev`,

  zoomStep1: `Go to: https://marketplace.zoom.us/develop/create

Click "Build" or "Create" 
Choose app type: "Server-to-Server OAuth"
Click "Create"`,

  zoomStep2: `In your Zoom App settings:

1. Go to "App Credentials" tab
2. Copy these 3 values:
   - Account ID  (e.g., "abc123DEF")
   - Client ID   (e.g., "7qF8kL2mN4pQ...")
   - Client Secret (click "Show" to reveal)

Save these - you'll need them for TBOS!`,

  zoomStep3: `In your Zoom App settings:

1. Go to "Scopes" tab
2. Click "Add Scopes"
3. Add these scopes:
   ✓ meeting:read:admin     (to list/get meetings)
   ✓ meeting:write:admin    (to create/update meetings)
   ✓ user:read:admin        (to get user info)
   ✓ recording:read:admin   (to get recordings)

4. Click "Done" then "Continue"`,

  zoomStep4: `Go to: https://marketplace.zoom.us/develop/manage

Find your app → Click "Activate"
Status should change to: "Active"

Your Zoom integration is now ready to use!`,
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast({ title: 'Copied!', description: `${label} copied to clipboard` })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group mt-2">
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

function StepCard({ step, icon: Icon, title, children, color }: {
  step: number
  icon: React.ElementType
  title: string
  children: React.ReactNode
  color: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`} style={{ backgroundColor: color }}>
              {step}
            </div>
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

export default function ZoomSetupGuide({ open, onOpenChange }: SetupGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-sky-600" />
            <DialogTitle>Zoom Integration Setup Guide</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete guide to set up real Zoom meetings in TBOS on your own computer
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overview */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <h4 className="font-semibold text-sky-900 mb-1">How It Works</h4>
            <p className="text-sm text-sky-800">
              TBOS uses <strong>Zoom Server-to-Server OAuth</strong> to create and manage meetings directly from your app.
              No manual copy-paste of Zoom links needed — TBOS handles everything automatically.
            </p>
          </div>

          {/* What You Need */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                What You Need
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">Required</Badge>
                <span>A <strong>Zoom Pro account</strong> or higher (free accounts have 40-min limit)</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">Required</Badge>
                <span>Access to <strong>Zoom App Marketplace</strong> (zoom.us) to create an OAuth app</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">Required</Badge>
                <span><strong>Node.js 18+</strong> and <strong>npm</strong> installed on your computer</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">Optional</Badge>
                <span>Cloud recording add-on (to auto-save class recordings in Zoom Cloud)</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* PART A: Download & Run the Project */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Download className="h-5 w-5 text-violet-600" />
              Part A: Download & Run on Your Computer
            </h3>

            <div className="space-y-3">
              <StepCard step={1} icon={FolderOpen} title="Get the Project Files" color="#8b5cf6">
                <div className="text-sm space-y-2">
                  <p>This project is a <strong>Next.js 16</strong> application. To run it on your computer:</p>
                  <CodeBlock code={codeBlocks.install} label="Setup commands" />
                  <p className="text-muted-foreground text-xs mt-2">
                    Copy the <code className="bg-zinc-100 px-1 rounded">src/</code>, <code className="bg-zinc-100 px-1 rounded">prisma/</code>, <code className="bg-zinc-100 px-1 rounded">public/</code> folders and config files (<code className="bg-zinc-100 px-1 rounded">package.json</code>, <code className="bg-zinc-100 px-1 rounded">next.config.ts</code>, <code className="bg-zinc-100 px-1 rounded">tsconfig.json</code>) from this project.
                  </p>
                </div>
              </StepCard>

              <StepCard step={2} icon={Terminal} title="Install Dependencies & Setup Database" color="#8b5cf6">
                <div className="text-sm space-y-2">
                  <p>After copying the files, run:</p>
                  <CodeBlock
                    code={`# Install all packages
npm install

# Setup the database (PostgreSQL / Neon)
npx prisma db push

# Run recommended indexes (see prisma/recommended-indexes.sql)
# Execute this SQL in your Neon SQL Editor

# Seed demo data (optional)
npx prisma db seed`}
                    label="Install commands"
                  />
                </div>
              </StepCard>

              <StepCard step={3} icon={Monitor} title="Start the App" color="#8b5cf6">
                <div className="text-sm space-y-2">
                  <CodeBlock
                    code={`npm run dev

# Open in your browser:
# http://localhost:3000
# Login: owner@csa.lk / password123`}
                    label="Start command"
                  />
                </div>
              </StepCard>
            </div>
          </div>

          <Separator />

          {/* PART B: Connect Zoom */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Plug className="h-5 w-5 text-sky-600" />
              Part B: Connect Your Zoom Account
            </h3>

            <div className="space-y-3">
              <StepCard step={1} icon={Globe} title="Create a Zoom Server-to-Server OAuth App" color="#0284c7">
                <div className="text-sm space-y-2">
                  <p>Go to the Zoom App Marketplace and create a new app:</p>
                  <CodeBlock code={codeBlocks.zoomStep1} label="Zoom marketplace steps" />
                  <Button variant="outline" size="sm" className="gap-2 mt-2" asChild>
                    <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Open Zoom App Marketplace
                    </a>
                  </Button>
                </div>
              </StepCard>

              <StepCard step={2} icon={Key} title="Copy Your Credentials" color="#0284c7">
                <div className="text-sm space-y-2">
                  <CodeBlock code={codeBlocks.zoomStep2} label="Credential steps" />
                </div>
              </StepCard>

              <StepCard step={3} icon={Shield} title="Add Required Scopes" color="#0284c7">
                <div className="text-sm space-y-2">
                  <CodeBlock code={codeBlocks.zoomStep3} label="Scope steps" />
                </div>
              </StepCard>

              <StepCard step={4} icon={Rocket} title="Activate the App" color="#0284c7">
                <div className="text-sm space-y-2">
                  <CodeBlock code={codeBlocks.zoomStep4} label="Activation steps" />
                </div>
              </StepCard>

              <StepCard step={5} icon={Plug} title="Connect in TBOS" color="#0284c7">
                <div className="text-sm space-y-2">
                  <p>Now go to the <strong>Online Classes / Zoom</strong> page in TBOS and click <strong>"Connect Zoom"</strong>. Enter:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                    <li><strong>Account ID</strong> — from Zoom App Credentials</li>
                    <li><strong>Client ID</strong> — from Zoom App Credentials</li>
                    <li><strong>Client Secret</strong> — from Zoom App Credentials</li>
                  </ul>
                  <p>TBOS will verify your credentials and connect immediately!</p>
                </div>
              </StepCard>
            </div>
          </div>

          <Separator />

          {/* PART C: Environment Variables (Advanced) */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Key className="h-5 w-5 text-amber-600" />
              Part C: Environment Variables (Alternative)
            </h3>
            <div className="text-sm space-y-2">
              <p>Instead of entering credentials in the UI, you can set them in a <code className="bg-zinc-100 px-1 rounded">.env</code> file:</p>
              <CodeBlock code={codeBlocks.envFile} label=".env file" />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Security:</strong> Never share your .env file or commit it to Git. Add <code>.env</code> to your <code>.gitignore</code>.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Features Summary */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-900 flex items-center gap-2">
                <Check className="h-4 w-4" />
                What You Get After Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-emerald-800 space-y-1.5">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Create Zoom meetings directly from TBOS</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Auto-generate join links & passcodes for students</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Live meeting indicator with "JOIN NOW" button</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Link meetings to batches, teachers & class sessions</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> View past meeting recordings</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Monthly stats: total meetings, hours, participants</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Copy meeting links with one click to share via WhatsApp</li>
              </ul>
            </CardContent>
          </Card>

          {/* Sri Lanka specific note */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
              <span className="text-lg">🇱🇰</span> Sri Lanka - Quick Tips
            </h4>
            <ul className="text-sm text-orange-800 space-y-1.5">
              <li>Zoom Pro costs ~$13.33/month (USD) — accept PayPal or international cards</li>
              <li>For Sri Lankan students, share the join link via <strong>WhatsApp</strong> — just click the copy button</li>
              <li>Set <strong>"Join Before Host"</strong> so students can enter while you prepare</li>
              <li>Use <strong>Mute Upon Entry</strong> to avoid background noise from 20+ students</li>
              <li>Enable <strong>Cloud Recording</strong> so absent students can watch later</li>
              <li>Zoom works well on SLT/Mobitel 4G — recommend students use WiFi when possible</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}