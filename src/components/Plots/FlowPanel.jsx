import { DropdownMenuIcon } from '@radix-ui/react-icons'
import { React, useState } from 'react'
import { MultiRange } from '../ui/multirange'
import { Button } from '../ui/button'

/* 
    * FlowPanel Component
    * Creates a control panel that allows for customization of flow visualizations
    * Features include:
    *   - Arrow Width Scaling 
    *       - Linear or logarithmic
    *       - Slider to adjust width
    *   - Time Range(s) Selection w/slider
    *   - Flux Range Slider (in mol m-3)
    *   - Species Selection Dropdown
*/

export function FlowPanel({
    arrowScaling, setArrowScaling,
    arrowWidth, setArrowWidth,
    timeValues, range, setRange,
    fluxValues, fluxRange, setFluxRange,
    selectedSpecies, setSelectedSpecies 
}) {

    const species = [
        { id: '1', name: 'Ar'},
        { id: '2', name: 'CO2'},
        { id: '3', name: 'H2O'},
        { id: '4', name: 'M'},
        { id: '5', name: 'N2'},
        { id: '6', name: 'O'},
        { id: '7', name: 'O1D'},
        { id: '8', name: 'O2'},
        { id: '9', name: 'O3'},
    ]

    return (
        <div className="flex flex-col gap-4 p-4 h-full min-h-[24rem] border rounded-md bg-white/10 text-white">
            {/* Arrow Width Scaling */}
            <label className="flex flex-col gap-1 items-center text-lg font-semibold">
                Arrow Width Scaling:
                <select
                    className="w-full rounded border bg-white !text-black px-2 py-1 text-base font-normal"
                    style={{ color: 'black' }}
                    value={arrowScaling}
                    onChange={(e) => setArrowScaling(e.target.value)}
                >
                    <option value="linear">Linear</option>
                    <option value="logarithmic">Logarithmic</option>
                </select>
            </label>

            {/* Arrow Width */}
            <label className="flex flex-col gap-1 items-center text-lg">
                Max Arrow Width: {arrowWidth}
                <input
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={arrowWidth}
                    onChange={(e) => setArrowWidth(e.target.value)}
                    className="w-full accent-teal-400"
                />
            </label>

            {/* Time Range */}
            <label className="flex flex-col gap-1 items-center text-lg font-semibold">
                Time Range [s]:
                <div className="w-full font-normal text-base">
                    <MultiRange
                        values={timeValues}
                        minIndex={range.minIndex}
                        maxIndex={range.maxIndex}
                        onChange={setRange}
                    />
                </div>
            </label>

            {/* Flux Range */}
            <label className="flex flex-col gap-1 items-center text-lg font-semibold">
                Flux Range [mol m-3]:
                <div className="w-full font-normal text-base">
                    <MultiRange
                        values={fluxValues}
                        minIndex={fluxRange.minIndex}
                        maxIndex={fluxRange.maxIndex}
                        onChange={setFluxRange}
                    />
                </div>
            </label>

            {/* Species Selection */}
            <label className="flex flex-col gap-1 items-center text-lg font-semibold">
                Select Species:
                <div className="w-full flex flex-col gap-1 font-normal text-base">
                    {species.map((s) => {
                        const isSelected = selectedSpecies?.includes(s.name);
                        return (
                            <button
                                key={s.id}
                                onClick={() => {
                                    if (isSelected) {
                                        setSelectedSpecies(selectedSpecies.filter((name) => name !== s.name));
                                    } else {
                                        setSelectedSpecies([...selectedSpecies, s.name]);
                                    }
                                }}
                                className={`w-full px-4 py-2 rounded text-white text-center transition-colors
                                          ${isSelected ? 'bg-white/30 backdrop-blur-sm border border-white/40 hover:bg-white/40' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                {s.name}
                            </button>
                        );
                    })}
                </div>
            </label>
        </div>
    )
}