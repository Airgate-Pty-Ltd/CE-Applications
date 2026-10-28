import { useCallback, useEffect, useMemo, useState } from 'react'
import { determine, type Determination } from '../engine/determine.ts'
import { emptyPlan, type ProjectPlan } from '../schema/plan.ts'
import { emptyProfile, type OrganizationProfile } from '../schema/profile.ts'
import { loadPlan, loadProfile, savePlan, saveProfile, storageAvailable } from '../storage/db.ts'

const ACTIVE_PLAN_ID = 'active'

export interface AppState {
  readonly profile: OrganizationProfile
  readonly plan: ProjectPlan
  /** Recomputed on every change. The single source of every regulatory answer. */
  readonly determination: Determination
  readonly loaded: boolean
  readonly setProfile: (update: Partial<OrganizationProfile>) => void
  readonly setPlan: (update: (plan: ProjectPlan) => ProjectPlan) => void
  /** Load a fixture scenario wholesale. Used by the test dashboard. */
  readonly loadScenario: (profile: OrganizationProfile, plan: ProjectPlan) => void
}

export function useAppState(): AppState {
  const [profile, setProfileState] = useState<OrganizationProfile>(emptyProfile)
  const [plan, setPlanState] = useState<ProjectPlan>(emptyPlan)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!storageAvailable()) {
      setLoaded(true)
      return
    }
    void (async () => {
      const [p, pl] = await Promise.all([loadProfile(), loadPlan(ACTIVE_PLAN_ID)])
      if (cancelled) return
      setProfileState(p)
      setPlanState(pl)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setProfile = useCallback((update: Partial<OrganizationProfile>) => {
    setProfileState((current) => {
      const next = { ...current, ...update }
      if (storageAvailable()) void saveProfile(next)
      return next
    })
  }, [])

  const setPlan = useCallback((update: (plan: ProjectPlan) => ProjectPlan) => {
    setPlanState((current) => {
      const next = update(current)
      if (storageAvailable()) void savePlan(ACTIVE_PLAN_ID, next)
      return next
    })
  }, [])

  const loadScenario = useCallback((nextProfile: OrganizationProfile, nextPlan: ProjectPlan) => {
    setProfileState(nextProfile)
    setPlanState(nextPlan)
    if (storageAvailable()) {
      void saveProfile(nextProfile)
      void savePlan(ACTIVE_PLAN_ID, nextPlan)
    }
  }, [])

  // The engine is pure and cheap, so the determination is derived rather than
  // stored. Nothing can hold a determination that disagrees with the inputs.
  const determination = useMemo(() => determine(plan, profile), [plan, profile])

  return { profile, plan, determination, loaded, setProfile, setPlan, loadScenario }
}
