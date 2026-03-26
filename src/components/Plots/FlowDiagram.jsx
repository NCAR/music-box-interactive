import { React } from 'react'
import { FlowGraph } from './FlowGraph'
import { FlowPanel } from './FlowPanel'

/*
    * FlowDiagram Component
    * Visualizes the flow of chemical species and reactions in a diagram format
    * This is a placeholder component and can be implemented using libraries like react-flow or d3 for interactive diagrams
*/

export function FlowDiagram() {
  return (
    <div className="flex h-full min-h-screen w-full gap-4">
      <div className="w-[30%] h-full">
        <FlowPanel />
      </div>
      <div className="w-[70%] h-full">
        <FlowGraph />
      </div>
    </div>
  )
}