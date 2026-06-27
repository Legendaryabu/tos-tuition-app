'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const steps = [
  { id: 1, title: 'Institute Details', description: 'Verify your tuition centre details' },
  { id: 2, title: 'Add Subjects', description: 'What subjects do you teach?' },
  { id: 3, title: 'Add Teachers', description: 'Add your teaching staff (optional)' },
]

export default function OnboardingView() {
  const { setActiveView, currentInstitute, setCurrentInstitute, currentUser } = useAppStore()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [completing, setCompleting] = useState(false)

  // Step 1 - pre-filled from registration data
  const [instituteName, setInstituteName] = useState(currentInstitute?.name || '')
  const [phone, setPhone] = useState(currentInstitute?.phone || currentUser?.mobile || '')
  const [city, setCity] = useState(currentInstitute?.city || 'Colombo')

  // Step 2
  const [subjects, setSubjects] = useState<string[]>([])
  const [newSubject, setNewSubject] = useState('')

  // Step 3
  const [teacherName, setTeacherName] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [teachers, setTeachers] = useState<{ name: string; email: string }[]>([])

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()])
      setNewSubject('')
    }
  }

  const removeSubject = (s: string) => {
    setSubjects(subjects.filter((x) => x !== s))
  }

  const addTeacher = () => {
    if (teacherName.trim()) {
      setTeachers([...teachers, { name: teacherName.trim(), email: teacherEmail.trim() }])
      setTeacherName('')
      setTeacherEmail('')
    }
  }

  const removeTeacher = (idx: number) => {
    setTeachers(teachers.filter((_, i) => i !== idx))
  }

  const handleComplete = async () => {
    if (!currentInstitute?.id) return
    setCompleting(true)
    try {
      // Persist onboarding data to the database
      const updateData: Record<string, any> = {
        onboardingCompleted: true,
        name: instituteName || currentInstitute.name,
        phone: phone || '',
        city: city || 'Colombo',
      }

      const res = await fetch('/api/institute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          ...updateData,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Update the store with the persisted institute data
        setCurrentInstitute({
          ...currentInstitute,
          ...updateData,
        })
        setActiveView('dashboard')
        toast({ title: 'Setup complete!', description: 'Your tuition centre is ready to use.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({
          title: 'Failed to save',
          description: err.error || 'Could not complete setup. Please try again.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Connection error',
        description: 'Could not save setup. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCompleting(false)
    }
  }

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, 3))
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1))

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">TBOS Setup</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      currentStep > step.id
                        ? 'bg-primary text-primary-foreground'
                        : currentStep === step.id
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{step.title}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Institute Name</Label>
                    <Input value={instituteName} onChange={(e) => setInstituteName(e.target.value)} placeholder="e.g., CSA Tuition Centre" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Colombo" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These details were filled during registration. You can update them here or in Settings later.
                  </p>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Add subject name (e.g., Mathematics)..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                    />
                    <Button variant="outline" onClick={addSubject}>Add</Button>
                  </div>
                  {subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-full text-sm font-medium"
                        >
                          {s}
                          <button onClick={() => removeSubject(s)} className="text-muted-foreground hover:text-destructive">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No subjects added yet. You can add subjects later from the Subjects section.
                    </p>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Teacher Name</Label>
                      <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (optional)</Label>
                      <Input value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} placeholder="teacher@example.lk" type="email" />
                    </div>
                  </div>
                  <Button variant="outline" onClick={addTeacher} className="w-full sm:w-auto">
                    Add Teacher
                  </Button>
                  {teachers.length > 0 && (
                    <div className="space-y-2">
                      {teachers.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">{t.name}</span>
                          <button onClick={() => removeTeacher(i)} className="text-muted-foreground hover:text-destructive text-sm">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    You can add more teachers later from the Teachers section.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {currentStep < 3 ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={completing} className="bg-primary">
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}