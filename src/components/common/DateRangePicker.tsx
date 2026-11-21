import React, { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  maxDays?: number; // Optional prop to limit the range length
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  maxDays = 30,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate ? new Date(endDate) : null);
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const today = new Date();
    // Determine initial right month based on allowed month difference
    const allowedMaxDiff = Math.max(1, Math.ceil(maxDays / 30));
    const rm = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return rm;
  });
  const [selectingStart, setSelectingStart] = useState(true);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Format date to YYYY-MM-DD string without timezone issues
  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display (DD-MM-YYYY)
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Calculate optimal dropdown position
  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Dropdown dimensions (approximate)
    const dropdownHeight = 400; // Height of the calendar dropdown
    const dropdownWidth = 550;  // Width of the calendar dropdown (two calendars side by side)
    
    // Calculate space available
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const spaceRight = viewportWidth - buttonRect.left;
    const spaceLeft = buttonRect.right;

    // Determine vertical position
    const newPosition = spaceBelow >= dropdownHeight ? 'bottom' : 
                       spaceAbove >= dropdownHeight ? 'top' : 'bottom';
    
    // Determine horizontal alignment
    const newAlign = spaceRight >= dropdownWidth ? 'left' : 
                    spaceLeft >= dropdownWidth ? 'right' : 'left';

    setDropdownPosition(newPosition);
    setDropdownAlign(newAlign);
  };

  // Set default date range to current month start + (maxDays - 1) days if no dates are provided
  useEffect(() => {
    if (!startDate && !endDate) {
      const today = new Date();
      // Start from the first day of current month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      // End date is (maxDays - 1) days after month start (maxDays total)
      const monthEnd = new Date(monthStart);
      monthEnd.setDate(monthStart.getDate() + Math.max(0, maxDays - 1));
      
      const startStr = formatDateToString(monthStart);
      const endStr = formatDateToString(monthEnd);
      
      onDateRangeChange(startStr, endStr);
      
      // Also set the temp dates for immediate display
      setTempStartDate(monthStart);
      setTempEndDate(monthEnd);
    }
  }, [startDate, endDate, onDateRangeChange, maxDays]);

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Check if date is in range
  const isDateInRange = (date: Date) => {
    if (!tempStartDate || !tempEndDate) return false;
    return date >= tempStartDate && date <= tempEndDate;
  };

  // Check if date is within the hover preview range while selecting end date
  const isDateInHoverRange = (date: Date) => {
    if (!tempStartDate || tempEndDate || selectingStart || !hoverDate) return false;
    // Only preview within allowed forward range (hover must be same or after start)
    if (hoverDate < tempStartDate) return false;
    return date >= tempStartDate && date <= hoverDate;
  };

  // Check if date is start or end
  const isStartDate = (date: Date) => {
    return tempStartDate && date.toDateString() === tempStartDate.toDateString();
  };

  const isEndDate = (date: Date) => {
    return tempEndDate && date.toDateString() === tempEndDate.toDateString();
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date) => {
    if (!tempStartDate || tempEndDate) return false; // No restrictions if no start date or range is complete
    
    // If we have a start date but no end date, disable dates outside maxDays range
    const startTime = tempStartDate.getTime();
    const dateTime = date.getTime();
    
    // Calculate days difference (positive for future dates, negative for past dates)
    const diffTime = dateTime - startTime;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Allow dates from start date up to (maxDays - 1) days later. Same-day selection allowed (diffDays === 0)
    return diffDays < 0 || diffDays > Math.max(0, maxDays - 1);
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    // Don't allow clicking disabled dates
    if (isDateDisabled(date)) return;
    
    if (selectingStart || !tempStartDate) {
      // First click - set start date only, let user select end date manually
      setTempStartDate(date);
      setTempEndDate(null);
      setSelectingStart(false);
      
      // Adjust calendar months to show the range properly
      const startMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const nextMonth = new Date(startMonth);
      nextMonth.setMonth(startMonth.getMonth() + 1);
      
      setLeftMonth(startMonth);
      setRightMonth(nextMonth);
    } else {
      // Second click - allow manual end date selection within maxDays range
      if (date < tempStartDate) {
        setTempStartDate(date);
        setTempEndDate(null);
      } else {
        setTempEndDate(date);
      }
      setSelectingStart(true);
    }
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next', side: 'left' | 'right') => {
    if (side === 'left') {
      const newMonth = new Date(leftMonth);
      newMonth.setMonth(leftMonth.getMonth() + (direction === 'next' ? 1 : -1));
      setLeftMonth(newMonth);
      
      // Reset selected dates when left month changes
      setTempStartDate(null);
      setTempEndDate(null);
      setSelectingStart(true);
      
      // Automatically set right month to the next month
      const newRightMonth = new Date(newMonth);
      newRightMonth.setMonth(newMonth.getMonth() + 1);
      setRightMonth(newRightMonth);
    } else {
      // Right calendar navigation constrained by allowed month difference from left
      const allowedMaxDiff = Math.max(1, Math.ceil(maxDays / 30));
      const newMonth = new Date(rightMonth);
      newMonth.setMonth(rightMonth.getMonth() + (direction === 'next' ? 1 : -1));

      const monthDiff = (newMonth.getFullYear() - leftMonth.getFullYear()) * 12 +
                        (newMonth.getMonth() - leftMonth.getMonth());
      // Allow right calendar between [1, allowedMaxDiff] months from left (strictly after left)
      if (monthDiff >= 1 && monthDiff <= allowedMaxDiff) {
        setRightMonth(newMonth);
      }
    }
  };

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      const startStr = formatDateToString(tempStartDate);
      const endStr = formatDateToString(tempEndDate);
      onDateRangeChange(startStr, endStr);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(startDate ? new Date(startDate) : null);
    setTempEndDate(endDate ? new Date(endDate) : null);
    setIsOpen(false);
  };

  // Sync temporary dates when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate ? new Date(startDate) : null);
      setTempEndDate(endDate ? new Date(endDate) : null);
      // Also sync visible months to the start date's month when opening
      if (startDate) {
        const sd = new Date(startDate);
        const startMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
        const nextMonth = new Date(startMonth);
        nextMonth.setMonth(startMonth.getMonth() + 1);
        setLeftMonth(startMonth);
        setRightMonth(nextMonth);
      }
      // Calculate optimal position when opening
      calculateDropdownPosition();
    }
  }, [isOpen, startDate, endDate]);

  // When parent updates the date range (e.g., on tab change), reset the visible months
  // so that the picker opens focused on the new range's start month.
  useEffect(() => {
    if (!isOpen && startDate) {
      const sd = new Date(startDate);
      const startMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
      const nextMonth = new Date(startMonth);
      nextMonth.setMonth(startMonth.getMonth() + 1);
      setLeftMonth(startMonth);
      setRightMonth(nextMonth);
    }
  }, [startDate, isOpen]);

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen]);

  // Ensure right calendar stays within the allowed span from left and prefers showing next month when possible
  useEffect(() => {
    const allowedMaxDiff = Math.max(1, Math.ceil(maxDays / 30));
    const diff = (rightMonth.getFullYear() - leftMonth.getFullYear()) * 12 +
                 (rightMonth.getMonth() - leftMonth.getMonth());

    // If right is before left or same as left when we can show next month, push it forward
    if (diff < 0) {
      const nm = new Date(leftMonth);
      nm.setMonth(leftMonth.getMonth() + Math.min(1, allowedMaxDiff));
      setRightMonth(nm);
    } else if (diff === 0 && allowedMaxDiff >= 1) {
      const nm = new Date(leftMonth);
      nm.setMonth(leftMonth.getMonth() + 1);
      setRightMonth(nm);
    } else if (diff > allowedMaxDiff) {
      const nm = new Date(leftMonth);
      nm.setMonth(leftMonth.getMonth() + allowedMaxDiff);
      setRightMonth(nm);
    }
  }, [leftMonth, rightMonth, maxDays]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const renderCalendar = (month: Date, side: 'left' | 'right') => {
    const days = getDaysInMonth(month);
    // Note: right calendar must be strictly after left calendar month
    
    return (
      <div className="w-60">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev', side)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <select
              value={month.getMonth()}
              onChange={(e) => {
                const newMonth = new Date(month);
                newMonth.setMonth(parseInt(e.target.value));
                if (side === 'left') {
                  setLeftMonth(newMonth);
                  // Reset selected dates when left month changes via dropdown
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setSelectingStart(true);
                  
                  // Automatically set right month to the next month
                  const newRightMonth = new Date(newMonth);
                  newRightMonth.setMonth(newMonth.getMonth() + 1);
                  setRightMonth(newRightMonth);
                } else {
                  // Constrain right calendar month within allowed span
                  const allowedMaxDiff = Math.max(1, Math.ceil(maxDays / 30));
                  const monthDiff = (newMonth.getFullYear() - leftMonth.getFullYear()) * 12 +
                                    (newMonth.getMonth() - leftMonth.getMonth());
                  if (monthDiff >= 1 && monthDiff <= allowedMaxDiff) {
                    setRightMonth(newMonth);
                  }
                }
              }}
              className="text-sm border-none bg-transparent focus:outline-none"
            >
              {monthNames.map((name, index) => {
                let isDisabled = false;
                if (side === 'right') {
                  // Build a date for this option using the currently selected year in this select group
                  const optionDate = new Date(month.getFullYear(), index, 1);
                  const leftStart = new Date(leftMonth.getFullYear(), leftMonth.getMonth(), 1);
                  // Calculate month difference from leftStart to optionDate
                  const monthDiff = (optionDate.getFullYear() - leftStart.getFullYear()) * 12 +
                                    (optionDate.getMonth() - leftStart.getMonth());
                  const allowedMaxDiff = Math.max(1, Math.ceil(maxDays / 30));
                  // Disable if option month is less than or equal to left month, or exceeds allowed span
                  if (monthDiff <= 0 || monthDiff > allowedMaxDiff) {
                    isDisabled = true;
                  }
                }
                return (
                  <option 
                    key={index} 
                    value={index}
                    disabled={isDisabled}
                    style={{ color: isDisabled ? '#ccc' : 'inherit' }}
                  >
                    {name}
                  </option>
                );
              })}
            </select>
            
            <select
              value={month.getFullYear()}
              onChange={(e) => {
                const newMonth = new Date(month);
                newMonth.setFullYear(parseInt(e.target.value));
                if (side === 'left') {
                  setLeftMonth(newMonth);
                  // Reset selected dates when left year changes via dropdown
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setSelectingStart(true);
                  
                  // Automatically set right month to the next month
                  const newRightMonth = new Date(newMonth);
                  newRightMonth.setMonth(newMonth.getMonth() + 1);
                  setRightMonth(newRightMonth);
                } else {
                  // Constrain right calendar year change within allowed span
                  const allowedMaxDiff = Math.max(1, Math.ceil(maxDays / 30));
                  const monthDiff = (newMonth.getFullYear() - leftMonth.getFullYear()) * 12 +
                                    (newMonth.getMonth() - leftMonth.getMonth());
                  if (monthDiff >= 1 && monthDiff <= allowedMaxDiff) {
                    setRightMonth(newMonth);
                  }
                }
              }}
              className="text-sm border-none bg-transparent focus:outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => 2020 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => navigateMonth('next', side)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-xs text-purple-400 text-center py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHoverDate(null)}>
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-8"></div>;
            }

            const isStart = isStartDate(day);
            const isEnd = isEndDate(day);
            const inRange = isDateInRange(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isDisabled = isDateDisabled(day);
            const inHoverRange = isDateInHoverRange(day);

            let cellClass = "h-8 w-8 text-sm flex items-center justify-center rounded ";
            
            if (isDisabled) {
              cellClass += "text-gray-300 cursor-not-allowed bg-gray-50 ";
            } else if (isStart || isEnd) {
              cellClass += "bg-blue-500 text-white cursor-pointer ";
            } else if (inRange) {
              cellClass += "bg-blue-100 text-blue-900 cursor-pointer ";
            } else if (inHoverRange) {
              // Light blue fade during hover preview
              cellClass += "bg-blue-50 text-blue-900 cursor-pointer ";
            } else if (isToday) {
              cellClass += "bg-gray-200 text-gray-900 cursor-pointer ";
            } else {
              cellClass += "text-gray-700 hover:bg-gray-100 cursor-pointer ";
            }

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                className={cellClass}
                disabled={isDisabled}
                onMouseEnter={() => {
                  // Only set hover when choosing end date and date is not disabled
                  if (!isDisabled && !selectingStart && tempStartDate && !tempEndDate) {
                    setHoverDate(day);
                  }
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Display Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 items-center gap-3 rounded-full border border-blue-400 bg-white px-4 text-sm text-gray-600 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <svg
          className="w-5 h-5 text-blue-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z"
          />
        </svg>
        <span className="whitespace-nowrap">
          {isOpen && tempStartDate && tempEndDate 
            ? `${formatDateForDisplay(formatDateToString(tempStartDate))} - ${formatDateForDisplay(formatDateToString(tempEndDate))}`
            : `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={`absolute bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] p-2 ${
            dropdownPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
          } ${
            dropdownAlign === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{
            maxHeight: '90vh',
            overflowY: 'auto',
            minWidth: '550px'
          }}
        >
          <div className="flex space-x-3">
            {/* Left Calendar */}
            {renderCalendar(leftMonth, 'left')}
            
            {/* Right Calendar */}
            {renderCalendar(rightMonth, 'right')}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-3 mt-3 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              CANCEL
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              APPLY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;

