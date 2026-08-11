import { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import {
  BasicConfigTab,
  InitialConditionsTab,
  EvolvingConditionsTab,
  ReviewTab,
} from '../Conditions'

/**
 * ConditionsPage Component
 * Main page for configuring simulation conditions with 4 tabs
 */
export function ConditionsPage() {
  const [activeTab, setActiveTab] = useState('basic') // 'basic' | 'initial' | 'evolving' | 'review'

  const tabs = [
    { id: 'basic', label: 'General', component: BasicConfigTab },
    { id: 'initial', label: 'Initial', component: InitialConditionsTab },
    { id: 'evolving', label: 'Evolving', component: EvolvingConditionsTab },
    { id: 'review', label: 'Review', component: ReviewTab },
  ]

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-3 pb-3 xs:pt-4 xs:pb-4 sm:pt-4 sm:pb-4">
          <div className="flex gap-1.5 xs:gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl text-xs xs:text-sm sm:text-base px-2.5 xs:px-3 sm:px-4 py-1 xs:py-1.5 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border border-border bg-transparent text-action'
                    : 'bg-transparent text-muted hover:bg-surface-hover hover:text-ink'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Tab Content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  )
}

export default ConditionsPage
