import { useState, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import ExampleLoader from '../ExampleLoader'
import SimulationStatus from '../SimulationStatus'
import CurrentExampleIndicator from '../CurrentExampleIndicator'
import { resetMechanism, setSelectedMechanism } from '../../redux/slices/mechanismSlice'
import { resetConditions, setExampleLoaded } from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Rocket, PenLine, FolderOpen, Library } from 'lucide-react'
import { loadMusicBoxConfig } from '../../services/config/loadMusicBoxConfig'
import { parseUploadedMusicBoxConfig } from '../../services/config/parseUploadedMusicBoxConfig'

// dashboard with quick actions and example loader
export function DashboardPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showSimulationStatus, setShowSimulationStatus] = useState(false)

  const handleStartFromScratch = () => {
    setShowConfirmation(true)
  }

  const confirmStartFromScratch = () => {
    dispatch(resetMechanism())
    dispatch(resetConditions())
    dispatch(setExampleLoaded(false))
    dispatch(setSelectedMechanism('custom'))
    // hide examples/status on fresh start
    setShowExamples(false)
    setShowSimulationStatus(false)
    toast({
      title: 'Started Fresh!',
      description: 'Add species in the Mechanism section.',
    })
    setShowConfirmation(false)
    navigate('/mechanism')
  }

  // Accepts a music-box v1 config: a plain .json, or a .zip bundling it with its CSV files.
  const handleLoadConfiguration = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    // Clear the input so re-selecting the same file after an error fires onChange again.
    event.target.value = ''

    parseUploadedMusicBoxConfig(file)
      .then((config) => {
        setShowExamples(false)
        setShowSimulationStatus(false)

        loadMusicBoxConfig(config, {
          dispatch,
          navigate,
          meta: {
            id: 'uploaded',
            name: `Uploaded: ${file.name}`,
            description: 'Custom configuration uploaded from file',
          },
        })

        toast({
          variant: 'success',
          title: 'Configuration Loaded Successfully!',
          description: `Loaded ${config.mechanism.species?.length || 0} species and ${config.mechanism.reactions?.length || 0} reactions from ${file.name}`,
        })
      })
      .catch((err) => {
        toast({
          title: 'Failed to Load Configuration',
          description:
            err?.message || 'Failed to load configuration file. Please check the file format.',
          variant: 'destructive',
        })
      })
  }

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 space-y-0">
          <div>
            <CardTitle className="text-xl xs:text-2xl sm:text-3xl">
              Welcome to MusicBox Interactive
            </CardTitle>
            <CardDescription className="text-sm xs:text-base text-gray-700 italic">
              Atmospheric Chemistry Box Model
            </CardDescription>
          </div>
          <a
            href="https://github.com/NCAR/musica"
            target="_blank"
            rel="noopener noreferrer"
            className="self-end text-xs text-blue-700 hover:text-blue-900 font-medium underline whitespace-nowrap"
          >
            Powered by MUSICA
          </a>
        </CardHeader>
      </Card>

      {/* Step-by-Step Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Workflow</CardTitle>
          <CardDescription className="text-gray-700">
            Follow these steps to run your first simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Horizontal Progress Line */}
            <div className="hidden md:block absolute left-0 right-0 top-5 h-0.5 bg-[linear-gradient(to_right,_#4ade80,_#fb923c,_#a78bfa,_#f472b6)] opacity-30"></div>

            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white/30 backdrop-blur-lg z-10">
                  1
                </div>
                <h3 className="font-bold text-sm">Define Your Mechanism</h3>
                <p className="text-xs text-gray-700">
                  Add chemical species and reactions on the <strong>Mechanism</strong> page.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white/30 backdrop-blur-lg z-10">
                  2
                </div>
                <h3 className="font-bold text-sm">Configure Conditions</h3>
                <p className="text-xs text-gray-700">
                  Set temperature, pressure, and initial concentrations on the{' '}
                  <strong>Conditions</strong> page.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white/30 backdrop-blur-lg z-10">
                  3
                </div>
                <h3 className="font-bold text-sm">Run Simulation</h3>
                <p className="text-xs text-gray-700">
                  Click <strong>Run Simulation</strong> in the Review tab under Conditions.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white/30 backdrop-blur-lg z-10">
                  4
                </div>
                <h3 className="font-bold text-sm">View Results</h3>
                <p className="text-xs text-gray-700">
                  Visualize and export concentration profiles on the <strong>Results</strong> page.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started Options */}
      <Card className="border-2 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg xs:text-xl sm:text-2xl">
            <Rocket className="w-5 h-5 xs:w-6 xs:h-6" />
            Getting Started
          </CardTitle>
          <CardDescription className="text-gray-700 italic text-sm xs:text-base">
            Choose how you want to start using MusicBox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Start from Scratch */}
            <div className="p-3 xs:p-4 bg-white/0 backdrop-blur-lg rounded-lg border-2 border-white/20">
              <div className="mb-2">
                <PenLine className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10" />
              </div>
              <h4 className="font-bold mb-2 text-sm xs:text-base">Start from Scratch</h4>
              <p className="text-xs text-gray-700 mb-3 italic">
                Build a custom mechanism from the ground up. Add species and reactions manually.
              </p>
              <Button
                onClick={handleStartFromScratch}
                variant="glass"
                className="w-full rounded-2xl border-2 text-xs xs:text-sm sm:text-base px-3 xs:px-4 py-2"
              >
                Create Custom
              </Button>
            </div>

            {/* Load Configuration */}
            <div className="p-3 xs:p-4 bg-white/0 backdrop-blur-lg rounded-lg border-2 border-white/20">
              <div className="mb-2">
                <FolderOpen className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10" />
              </div>
              <h4 className="font-bold mb-2 text-sm xs:text-base">Load Configuration</h4>
              <p className="text-xs text-gray-700 mb-3 xs:mb-7 italic">
                Load a music-box configuration (.json), or a .zip if it references CSV files.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.zip"
                onChange={handleLoadConfiguration}
                className="hidden"
              />
              <Button
                variant="glass"
                className="w-full rounded-2xl border-2 cursor-pointer text-xs xs:text-sm sm:text-base px-3 xs:px-4 py-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Config
              </Button>
            </div>

            {/* Select Example */}
            <div className="p-3 xs:p-4 bg-white/0 backdrop-blur-lg rounded-lg border-2 border-white/20">
              <div className="mb-2">
                <Library className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10" />
              </div>
              <h4 className="font-bold mb-2 text-sm xs:text-base">Select Example</h4>
              <p className="text-xs text-gray-700 mb-3 italic">
                Choose from pre-configured examples (Chapman, TS1, Full Configuration) to get
                started quickly.
              </p>
              <Button
                variant="glass"
                className="w-full rounded-2xl border-2 text-xs xs:text-sm sm:text-base px-3 xs:px-4 py-2"
                onClick={() => {
                  const newShowState = !showExamples
                  setShowExamples(newShowState)
                  setShowSimulationStatus(newShowState)
                  if (newShowState) {
                    // Scroll to examples section after a short delay to allow rendering
                    setTimeout(() => {
                      document
                        .getElementById('example-section')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }, 100)
                  }
                }}
              >
                {showExamples ? 'Hide Examples' : 'Browse Examples'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Alert */}
      {showConfirmation && (
        <Alert className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-md glass border-2 shadow-2xl">
          <AlertTitle className="text-lg font-bold mb-2">Start from Scratch?</AlertTitle>
          <AlertDescription className="mb-4">
            This will clear any existing configuration. Are you sure you want to continue?
          </AlertDescription>
          <div className="flex gap-3 justify-end">
            <Button
              variant="glass"
              onClick={() => setShowConfirmation(false)}
              className="glass-button bg-red-600 text-white hover:bg-red-700"
            >
              Cancel
            </Button>
            <Button
              variant="glass"
              onClick={confirmStartFromScratch}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Yes, Start Fresh
            </Button>
          </div>
        </Alert>
      )}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowConfirmation(false)}
        />
      )}

      {/* Current Example Indicator */}
      {/* <CurrentExampleIndicator /> */}

      {/* Simulation Status - Hidden by default, shown when Browse Examples is clicked */}
      {showSimulationStatus && <SimulationStatus />}

      {/* Example Loader - Hidden by default, shown when Browse Examples is clicked */}
      {showExamples && (
        <div id="example-section">
          <ExampleLoader />
        </div>
      )}

      {/* Guide: Need Help */}
      <Card className="border-2 border-white/20">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Resources &amp; Support</CardTitle>
          <a
            href="https://github.com/NCAR/music-box-interactive/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium whitespace-nowrap"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-current"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.28 5.69.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.21.66.79.55A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
            </svg>
            Report a Bug
          </a>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Go Further Programmatically</h4>
            <p className="text-gray-700 mb-2">
              Build custom workflows with the MusicBox Python or JavaScript APIs.
            </p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://github.com/NCAR/music-box"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 font-medium underline"
                >
                  MusicBox Tutorials &amp; Documentation (includes Binder notebooks)
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Build Bigger Models</h4>
            <p className="text-gray-700 mb-2">
              For column or global models, use MUSICA and any of its interfaces.
            </p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://ncar.github.io/musica/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 font-medium underline"
                >
                  MUSICA Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/NCAR/musica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 font-medium underline"
                >
                  MUSICA GitHub Repository (includes Binder tutorials)
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
