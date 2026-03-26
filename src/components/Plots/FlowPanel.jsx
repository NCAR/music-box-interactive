import { DropdownMenuIcon } from '@radix-ui/react-icons'
import { React, useState } from 'react'
import { MultiRange } from '../ui/multirange'

/* 
    * FlowPanel Component
    * Creates a control panel that allows for customization of flow visualizations
    * Features include:
    *   - Arrow Width Scaling 
    *       - Linear or logaritmic
    *       - Slider to adjust width
    *   - Time Range(s) Selection w/slider
    *   - Flux Range Slider (in mol m-3)
    *   - Species Selection Dropdown
*/

export function FlowPanel() {
    const [arrowScaling, setArrowScaling] = useState('linear');
    const [arrowWidth, setArrowWidth] = useState(1);

    const timeValues = Array.from({ length: 1000 }, (_, i) => i * 259);
    const [range, setRange] = useState({ minIndex: 0, maxIndex: timeValues.length - 1 });

    const FLUX_MIN = 0.00004155230486602744;
    const FLUX_MAX = 0.9648828478468641
    const fluxValues = Array.from({ length: 1000 }, (_, i) => 
        FLUX_MIN + (i / 999) * (FLUX_MAX - FLUX_MIN)
    );
    const [fluxRange, setFluxRange] = useState({ minIndex: 0, maxIndex: fluxValues.length - 1 });

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
            </label>
        </div>
    )
}