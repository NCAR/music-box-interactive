import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setError, setMetadata, setResults, setStatus } from '../redux/slices/simulationSlice'
import { toast } from '@/hooks/use-toast'
import { runLocalSimulation } from '../services/simulation/localSolver'

export function useRunSimulation() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const simulation = useSelector((state) => state.simulation)
  const mechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const mechanismData = useSelector((state) => state.mechanism)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const conditions = useSelector((state) => state.conditions)

  const sourceMechanism = mechanismData.mechanism?.mechanism || {}
  const payloadSpeciesCount =
    mechanismData.species.length > 0
      ? mechanismData.species.length
      : Array.isArray(sourceMechanism.species)
        ? sourceMechanism.species.length
        : 0
  const payloadReactionCount =
    mechanismData.reactions.length > 0
      ? mechanismData.reactions.length
      : Array.isArray(sourceMechanism.reactions)
        ? sourceMechanism.reactions.length
        : 0
  const hasValidMechanism = payloadSpeciesCount > 0 && payloadReactionCount > 0

  const isPredefinedMechanism = mechanism && mechanism !== 'custom'

  const isRunning = simulation.status === 'running'
  const isDisabled = isRunning || !hasValidMechanism

  const getTooltip = () => {
    if (isRunning) return 'Simulation is currently running...'
    if (payloadSpeciesCount === 0) return 'Add or load species to run simulation'
    if (payloadReactionCount === 0) return 'Add or load reactions to run simulation'
    if (isPredefinedMechanism && !currentExample) return 'Please select an example mechanism'
    return 'Run atmospheric chemistry simulation'
  }

  const runSimulation = useCallback(async () => {
    if (isDisabled) return

    dispatch(setStatus('running'))
    dispatch(setError(null))

    try {
      const { results, metadata } = await runLocalSimulation({
        mechanismData,
        conditions,
      })

      dispatch(setResults(results))
      dispatch(setMetadata(metadata))
      dispatch(setStatus('succeeded'))
      navigate('/plots')
    } catch (error) {
      const message = error?.message || 'Failed to create MICM solver from mechanism'
      dispatch(setError({ message }))
      dispatch(setStatus('failed'))
      toast({
        title: 'Simulation Failed',
        description: message,
        variant: 'delete',
      })
    }
  }, [conditions, dispatch, isDisabled, mechanismData, navigate])

  return {
    runSimulation,
    isRunning,
    isDisabled,
    tooltip: getTooltip(),
  }
}

export default useRunSimulation
