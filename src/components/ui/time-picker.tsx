import React, { useState, useEffect } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  hasError?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className = "",
  id,
  name,
  placeholder = "Select time",
  hasError = false
}) => {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');

  // Parse initial value
  useEffect(() => {
    if (value) {
      const timeMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (timeMatch) {
        setHour(timeMatch[1]);
        setMinute(timeMatch[2]);
        setPeriod(timeMatch[3].toUpperCase());
      }
    } else {
      setHour('');
      setMinute('');
      setPeriod('AM');
    }
  }, [value]);

  // Update parent when any part changes
  useEffect(() => {
    if (hour && minute) {
      const formattedTime = `${hour}:${minute} ${period}`;
      // Only call onChange if the value actually changed
      if (formattedTime !== value) {
        onChange(formattedTime);
      }
    } else if (value !== '') {
      // Only send empty string if the current value is not already empty
      onChange('');
    }
  }, [hour, minute, period, value]); // Added value to dependencies

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const hourValue = i + 1;
    return { value: hourValue.toString(), label: hourValue.toString() };
  });

  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '05', label: '05' },
    { value: '10', label: '10' },
    { value: '15', label: '15' },
    { value: '20', label: '20' },
    { value: '25', label: '25' },
    { value: '30', label: '30' },
    { value: '35', label: '35' },
    { value: '40', label: '40' },
    { value: '45', label: '45' },
    { value: '50', label: '50' },
    { value: '55', label: '55' }
  ];

  const periodOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
  ];

  // Determine border color based on error state
  const borderColor = hasError ? 'border-red-500' : 'border-gray-300';
  const focusBorderColor = hasError ? 'focus:border-red-600' : 'focus:border-blue-500';

  return (
    <div className={`flex items-start space-x-2 ${className}`}>
      {/* Hour Select */}
      <div className="flex flex-col">
        <select
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          className={`w-16 h-10 text-center border ${borderColor} rounded-md bg-white ${focusBorderColor} focus:outline-none text-gray-700 text-sm`}
          id={id ? `${id}-hour` : undefined}
        >
          <option value="">HH</option>
          {hourOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 mt-1 text-center">Pick hour</span>
      </div>

      {/* Colon separator */}
      <div className="text-lg font-bold text-gray-400 pt-2">:</div>

      {/* Minute Select */}
      <div className="flex flex-col">
        <select
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className={`w-16 h-10 text-center border ${borderColor} rounded-md bg-white ${focusBorderColor} focus:outline-none text-gray-700 text-sm`}
          id={id ? `${id}-minute` : undefined}
        >
          <option value="">MM</option>
          {minuteOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 mt-1 text-center">Pick minute</span>
      </div>

      {/* AM/PM Select */}
      <div className="flex flex-col">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={`w-16 h-10 text-center border ${borderColor} rounded-md bg-white ${focusBorderColor} focus:outline-none text-gray-700 text-sm`}
          id={id ? `${id}-period` : undefined}
        >
          {periodOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hidden input for form compatibility */}
      <input
        type="hidden"
        name={name}
        value={hour && minute ? `${hour}:${minute} ${period}` : ''}
      />
    </div>
  );
};

export default TimePicker;
