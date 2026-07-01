'use client'

import { useEffect } from 'react'
import { initFetchInterceptor } from '@/lib/fetch'

export default function FetchInitializer() {
  useEffect(() => {
    initFetchInterceptor()
  }, [])

  return null
}