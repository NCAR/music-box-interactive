import { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { SpeciesEditor, ReactionEditor } from '../Mechanism'

/**
 * MechanismPage Component
 * Main page for editing chemical mechanism (species and reactions)
 */
export function MechanismPage() {
  const [activeTab, setActiveTab] = useState('species') // 'species' | 'reactions'

  const tabs = [
    { id: 'species', label: 'Species', component: SpeciesEditor },
    { id: 'reactions', label: 'Reactions', component: ReactionEditor},
  ]

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-3 pb-3 xs:pt-4 xs:pb-4 sm:pt-4 sm:pb-4">
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 xs:gap-3">
            <div className="flex gap-1.5 xs:gap-2 flex-1 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-2xl text-xs xs:text-sm sm:text-base px-3 xs:px-4 sm:px-6 py-1 xs:py-1.5 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border border-border bg-transparent text-action'
                      : 'bg-transparent text-muted hover:bg-surface-hover hover:text-ink'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tab Content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  )
}

export default MechanismPage
