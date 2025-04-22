import React, { useCallback, useEffect, useState, useRef } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import "./multiRangeSlider.css";

const MultiRangeSlider = ({ values, minIndex, maxIndex, onChange }) => {
  const minIndexRef = useRef(null);
  const maxIndexRef = useRef(null);
  const range = useRef(null);

  // Convert to percentage
  const getPercent = useCallback(
    (index) => Math.round((index / values.length) * 100),
    [values.length],
  );

  // Set width of the range to decrease from the left side
  useEffect(() => {
    if (maxIndexRef.current) {
      const minPercent = getPercent(minIndex);
      const maxPercent = getPercent(+maxIndexRef.current.value); // Preceding with '+' converts the value from type string to type number

      if (range.current) {
        range.current.style.left = `${minPercent}%`;
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [minIndex, getPercent]);

  // Set width of the range to decrease from the right side
  useEffect(() => {
    if (minIndexRef.current) {
      const minPercent = getPercent(+minIndexRef.current.value);
      const maxPercent = getPercent(maxIndex);

      if (range.current) {
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [maxIndex, getPercent]);

  // Get min and max values when their state changes
  useEffect(() => {
    onChange({ minIndex: minIndex, maxIndex: maxIndex });
  }, [minIndex, maxIndex, onChange]);

  return (
    <div className="container slider-container">
      <input
        type="range"
        min={0}
        max={values.length - 1}
        value={minIndex}
        ref={minIndexRef}
        onChange={(event) => {
          onChange({ minIndex: +event.target.value, maxIndex: maxIndex });
        }}
        className={classnames("thumb thumb--zindex-3", {
          "thumb--zindex-5": minIndex > values - 100,
        })}
      />
      <input
        type="range"
        min={0}
        max={values.length - 1}
        value={maxIndex}
        ref={maxIndexRef}
        onChange={(event) => {
          onChange({ minIndex: minIndex, maxIndex: +event.target.value });
        }}
        className="thumb thumb--zindex-4"
      />

      <div className="slider">
        <div className="slider__track" />
        <div ref={range} className="slider__range" />
        <div className="slider__left-value">
          {(Math.abs(values[minIndex]) > 0.001 &&
            Math.abs(values[minIndex]) < 1.0e6) ||
          values[minIndex] == 0.0
            ? values[minIndex].toPrecision(3)
            : values[minIndex]?.toExponential(3)}
        </div>
        <div className="slider__right-value">
          {(Math.abs(values[maxIndex]) > 0.001 &&
            Math.abs(values[maxIndex]) < 1.0e6) ||
          values[maxIndex] == 0.0
            ? values[maxIndex].toPrecision(3)
            : values[maxIndex]?.toExponential(3)}
        </div>
      </div>
    </div>
  );
};

MultiRangeSlider.propTypes = {
  values: PropTypes.arrayOf(PropTypes.number).isRequired,
  minIndex: PropTypes.number.isRequired,
  maxIndex: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default MultiRangeSlider;
