import { useCallback, useEffect, useRef } from 'react';

export function MultiRange({ values, minIndex, maxIndex, onChange }) {
    const minIndexRef = useRef(null);
    const maxIndexRef = useRef(null);
    const rangeRef = useRef(null);

    const getPercent = useCallback(
        (index) => Math.round((index / (values.length - 1)) * 100),
        [values.length]
    );

    useEffect(() => {
        if (maxIndexRef.current && rangeRef.current) {
            const minPercent = getPercent(minIndex);
            const maxPercent = getPercent(+maxIndexRef.current.value);
            rangeRef.current.style.left = `${minPercent}%`;
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minIndex, getPercent]);

    useEffect(() => {
        if (minIndexRef.current && rangeRef.current) {
            const minPercent = getPercent(+minIndexRef.current.value); // ✅ read from ref
            const maxPercent = getPercent(maxIndex);
            rangeRef.current.style.left = `${minPercent}%`;            // ✅ was using wrong value
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [maxIndex, getPercent]);

    const formatValue = (v) =>
        (Math.abs(v) > 0.001 && Math.abs(v) < 1.0e6) || v === 0
            ? v.toPrecision(3)
            : v?.toExponential(3);

    return (
        <div className="flex flex-col gap-4">
            <style>{`
                .multirange-thumb {
                    pointer-events: none;
                    position: absolute;
                    width: 100%;
                    height: 0;
                    outline: none;
                    appearance: none;
                    -webkit-appearance: none;
                    background: transparent;
                }
                .multirange-thumb::-webkit-slider-thumb {
                    appearance: none;
                    -webkit-appearance: none;
                    pointer-events: all;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: #2dd4bf;
                    cursor: pointer;
                    border: none;
                }
                .multirange-thumb::-moz-range-thumb {
                    pointer-events: all;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: #2dd4bf;
                    cursor: pointer;
                    border: none;
                }
            `}</style>

            {/* Number inputs */}
            <div className="flex gap-2 items-center">
                <input
                    type="number"
                    value={values[minIndex]}
                    onChange={(e) => {
                        const closest = values.reduce((bestIdx, v, i) =>
                            Math.abs(v - +e.target.value) < Math.abs(values[bestIdx] - +e.target.value) ? i : bestIdx, 0);
                        onChange({ minIndex: Math.min(closest, maxIndex), maxIndex });
                    }}
                    className="w-24 border rounded px-2 py-1 bg-white text-black"
                />
                <span>to</span>
                <input
                    type="number"
                    value={values[maxIndex]}
                    onChange={(e) => {
                        const closest = values.reduce((bestIdx, v, i) =>
                            Math.abs(v - +e.target.value) < Math.abs(values[bestIdx] - +e.target.value) ? i : bestIdx, 0);
                        onChange({ minIndex, maxIndex: Math.max(closest, minIndex) });
                    }}
                    className="w-24 border rounded px-2 py-1 bg-white text-black"
                />
            </div>

            {/* Slider */}
            <div className="relative h-4 flex items-center" style={{ overflow: 'visible' }}>
                <input
                    type="range"
                    min={0}
                    max={values.length - 1}
                    value={minIndex}
                    ref={minIndexRef}
                    onChange={(e) => onChange({ minIndex: Math.min(+e.target.value, maxIndex), maxIndex })}
                    className="multirange-thumb"
                    style={{ zIndex: minIndex > maxIndex - 1 ? 50 : 30 }}
                />
                <input
                    type="range"
                    min={0}
                    max={values.length - 1}
                    value={maxIndex}
                    ref={maxIndexRef}
                    onChange={(e) => onChange({ minIndex, maxIndex: Math.max(+e.target.value, minIndex) })}
                    className="multirange-thumb"
                    style={{ zIndex: 40 }}
                />
                <div className="absolute w-full h-1 rounded bg-gray-600" style={{ zIndex: 10 }} />
                <div ref={rangeRef} className="absolute h-1 rounded bg-teal-400" style={{ zIndex: 10 }} /> {/* ✅ fixed color */}
            </div>

            {/* Labels */}
            <div className="flex justify-between text-sm text-gray-400">
                <span>{formatValue(values[minIndex])}</span>
                <span>{formatValue(values[maxIndex])}</span>
            </div>
        </div>
    );
}
