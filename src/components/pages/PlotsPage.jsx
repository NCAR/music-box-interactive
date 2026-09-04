import { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { SpeciesPlot, ReactionRatesPlot, EnvironmentPlot, FlowDiagram, FluxAnalysis } from '../Plots'
import { Atom, FlaskConical, Thermometer, Waypoints, GitBranch } from 'lucide-react'

/**
 * PlotsPage Component
 * Multi-tab page for viewing different types of simulation results
 */
export function PlotsPage() {
  const [activeTab, setActiveTab] = useState('species') // 'species' | 'reactions' | 'environment'

  const tabs = [
    { id: 'species', label: 'Species', Icon: Atom, component: SpeciesPlot },
    { id: 'reactions', label: 'Reaction Rates', Icon: FlaskConical, component: ReactionRatesPlot },
    { id: 'environment', label: 'Environment', Icon: Thermometer, component: EnvironmentPlot },
    { id: 'flow-diagram', label: 'Flow Diagram', Icon: Waypoints, component: FlowDiagram },
    { id: 'flux-analysis', label: 'Flux Analysis', Icon: GitBranch, component: FluxAnalysis },
  ]

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-3 pb-3 xs:pt-4 xs:pb-4 sm:pt-4 sm:pb-4">
          <div className="flex flex-col xs:flex-row gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.Icon
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-2xl text-xs xs:text-sm sm:text-base px-3 xs:px-4 py-1 xs:py-1.5 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border border-border bg-transparent text-action'
                      : 'bg-transparent text-muted hover:bg-surface-hover hover:text-ink'
                  }`}
                >
                  <IconComponent className="w-4 h-4 xs:w-5 xs:h-5 mr-1.5 xs:mr-2" />
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Tab Content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  )
}

export default PlotsPage
