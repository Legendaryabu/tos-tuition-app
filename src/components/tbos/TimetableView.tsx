'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Video, MapPin, Clock, AlertTriangle, Calendar } from 'lucide-react'

// --- Types ---
interface TimetableSlot {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  batchId: string
  teacherId: string
  hallId: string
  branchId: string
  isOnline?: boolean
  batch: { name: string; subject?: { name: string; color: string } | null } | null
  teacher: { firstName: string; lastName: string } | null
  hall: { name: string } | null
  branch: { name: string } | null
}

// --- Constants ---
const DISPLAY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// 30-min increments from 7:00 AM to 8:00 PM
function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 7; h < 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, '0')
      const mm = m.toString().padStart(2, '0')
      slots.push(`${hh}:${mm}`)
    }
  }
  return slots
}

const ALL_TIME_SLOTS = generateTimeSlots()

const PRESET_COLORS = [
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981' },
  { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-800 dark:text-teal-300', dot: '#14b8a6' },
  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-300', dot: '#f59e0b' },
  { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-800 dark:text-rose-300', dot: '#f43f5e' },
  { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', dot: '#f97316' },
  { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-800 dark:text-violet-300', dot: '#8b5cf6' },
  { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-800 dark:text-cyan-300', dot: '#06b6d4' },
  { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-800 dark:text-pink-300', dot: '#ec4899' },
]

function formatTimeSlot(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Compute how many 30-min rows a slot spans
function getSlotRowSpan(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const diff = endMin - startMin
  return Math.max(1, Math.round(diff / 30))
}

// Get color by subject color or by index
function getColorForSlot(slot: TimetableSlot, index: number) {
  const subjectColor = slot.batch?.subject?.color
  if (subjectColor) {
    // Find the closest preset or use the subject color directly
    return { custom: true, color: subjectColor }
  }
  return { custom: false, ...PRESET_COLORS[index % PRESET_COLORS.length] }
}

export default function TimetableView() {
  const { currentInstitute } = useAppStore()
  const instituteId = currentInstitute?.id

  const [timetable, setTimetable] = useState<Record<string, TimetableSlot[]>>({})
  const [allSlots, setAllSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!instituteId) {
      setLoading(false)
      return
    }
    const fetchTimetable = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/timetable?instituteId=${instituteId}`)
        if (!res.ok) throw new Error('Failed to load timetable')
        const data = await res.json()
        setTimetable(data.timetable || {})
        setAllSlots(data.slots || [])
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchTimetable()
  }, [instituteId])

  // Determine which time slots actually have data (to show only relevant rows)
  const activeTimeSlots = useMemo(() => {
    if (allSlots.length === 0) return ALL_TIME_SLOTS
    const usedTimes = new Set(allSlots.map((s) => s.startTime))
    // Only show time slots that have sessions or are ±1 slot around a session
    const visibleSlots = new Set<string>()
    for (const t of usedTimes) {
      visibleSlots.add(t)
      const [h, m] = t.split(':').map(Number)
      // Add previous and next 30-min slots
      const prevMin = h * 60 + m - 30
      const nextMin = h * 60 + m + 30
      if (prevMin >= 7 * 60) {
        const ph = Math.floor(prevMin / 60)
        const pm = prevMin % 60
        visibleSlots.add(`${ph.toString().padStart(2, '0')}:${pm.toString().padStart(2, '0')}`)
      }
      if (nextMin < 20 * 60) {
        const nh = Math.floor(nextMin / 60)
        const nm = nextMin % 60
        visibleSlots.add(`${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`)
      }
    }
    return ALL_TIME_SLOTS.filter((t) => visibleSlots.has(t))
  }, [allSlots])

  // Build a lookup: { "Monday-08:00": slot }
  const slotLookup = useMemo(() => {
    const map: Record<string, TimetableSlot> = {}
    for (const slot of allSlots) {
      const dayName = DISPLAY_DAYS[slot.dayOfWeek - 1] || `Day${slot.dayOfWeek}`
      map[`${dayName}-${slot.startTime}`] = slot
    }
    return map
  }, [allSlots])

  // Track which cells are "occupied" by spanning slots
  const occupiedCells = useMemo(() => {
    const set = new Set<string>()
    for (const slot of allSlots) {
      const dayName = DISPLAY_DAYS[slot.dayOfWeek - 1] || `Day${slot.dayOfWeek}`
      const [sh, sm] = slot.startTime.split(':').map(Number)
      const span = getSlotRowSpan(slot.startTime, slot.endTime)
      for (let i = 1; i < span; i++) {
        const offsetMin = sh * 60 + sm + i * 30
        const oh = Math.floor(offsetMin / 60)
        const om = offsetMin % 60
        const timeKey = `${oh.toString().padStart(2, '0')}:${om.toString().padStart(2, '0')}`
        set.add(`${dayName}-${timeKey}`)
      }
    }
    return set
  }, [allSlots])

  const totalSlots = allSlots.length

  // Color index counter per subject for consistent coloring
  const subjectColorIndex = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    const seen = new Set<string>()
    for (const slot of allSlots) {
      const key = slot.batch?.subject?.color || slot.batch?.subject?.name || slot.batch?.name || slot.id
      if (!seen.has(key)) {
        seen.add(key)
        map.set(key, idx++)
      }
    }
    return map
  }, [allSlots])

  if (!instituteId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground">Weekly class schedule overview</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No institute selected</h3>
            <p className="text-sm text-muted-foreground mt-1">Please select an institute to view the timetable.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${totalSlots} slot${totalSlots !== 1 ? 's' : ''} this week`}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span>Physical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Video className="h-3.5 w-3.5 text-sky-600" />
          <span>Online</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Failed to load timetable</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && totalSlots === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No timetable slots configured</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add timetable slots from the settings or batch configuration to see the weekly schedule here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timetable Grid */}
      {!loading && !error && totalSlots > 0 && (
        <div className="overflow-x-auto -mx-px">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
              <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground sticky left-0 z-10">
                <Clock className="h-3.5 w-3.5 mx-auto" />
              </div>
              {DISPLAY_DAYS.map((day) => (
                <div key={day} className="bg-muted p-2 text-center text-xs font-semibold">
                  {day}
                </div>
              ))}
            </div>

            {/* Time rows */}
            {activeTimeSlots.map((time) => (
              <div key={time} className="grid grid-cols-7 gap-px bg-border border-t last:rounded-b-lg overflow-hidden">
                {/* Time label */}
                <div className="bg-muted p-1.5 flex items-center justify-center text-[11px] text-muted-foreground min-h-[52px] sticky left-0 z-10">
                  {formatTimeSlot(time)}
                </div>

                {/* Day cells */}
                {DISPLAY_DAYS.map((day) => {
                  const cellKey = `${day}-${time}`
                  const slot = slotLookup[cellKey]

                  // Skip if this cell is part of a multi-row span
                  if (!slot && occupiedCells.has(cellKey)) {
                    return <div key={day} className="bg-background min-h-[52px]" />
                  }

                  if (slot) {
                    const colorKey = slot.batch?.subject?.color || slot.batch?.subject?.name || slot.batch?.name || slot.id
                    const colorInfo = getColorForSlot(slot, subjectColorIndex.get(colorKey) || 0)

                    return (
                      <div
                        key={day}
                        className="bg-background p-0.5 min-h-[52px]"
                      >
                        {colorInfo.custom ? (
                          <div
                            className="border rounded p-1.5 h-full flex flex-col justify-center"
                            style={{
                              backgroundColor: `${colorInfo.color}15`,
                              borderColor: `${colorInfo.color}40`,
                            }}
                          >
                            <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: colorInfo.color }}>
                              {slot.batch?.name || 'Unknown'}
                            </p>
                            {slot.teacher && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {slot.teacher.firstName} {slot.teacher.lastName}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              {slot.hall ? (
                                <MapPin className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Video className="h-2.5 w-2.5 text-sky-600" />
                              )}
                              <span className="text-[9px] text-muted-foreground">
                                {slot.hall ? slot.hall.name : 'Online'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className={`${colorInfo.bg} ${colorInfo.border} border rounded p-1.5 h-full flex flex-col justify-center`}>
                            <div className="flex items-center gap-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: colorInfo.dot }}
                              />
                              <p className="text-[11px] font-semibold leading-tight truncate">
                                {slot.batch?.name || 'Unknown'}
                              </p>
                            </div>
                            {slot.teacher && (
                              <p className="text-[10px] opacity-75 truncate">
                                {slot.teacher.firstName} {slot.teacher.lastName}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              {slot.hall ? (
                                <MapPin className="h-2.5 w-2.5" />
                              ) : (
                                <Video className="h-2.5 w-2.5" />
                              )}
                              <span className="text-[9px] opacity-60">
                                {slot.hall ? slot.hall.name : 'Online'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  return <div key={day} className="bg-background min-h-[52px]" />
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}