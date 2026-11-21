import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SingleMonthDateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  maxDays?: number;
}

const formatDateToString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const today = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
})();

const SingleMonthDateRangePicker: React.FC<SingleMonthDateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  maxDays = 60,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownCoordinates, setDropdownCoordinates] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const defaultRange = useMemo(() => {
    const monthStart = getMonthStart(today);
    return {
      start: formatDateToString(monthStart),
      end: formatDateToString(today),
    };
  }, []);

  const effectiveStart = startDate || defaultRange.start;
  const effectiveEnd = endDate || defaultRange.end;

  const [tempStart, setTempStart] = useState<Date | null>(effectiveStart ? new Date(effectiveStart) : null);
  const [tempEnd, setTempEnd] = useState<Date | null>(effectiveEnd ? new Date(effectiveEnd) : null);
  const [selectingStart, setSelectingStart] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const reference = effectiveEnd ? new Date(effectiveEnd) : today;
    return getMonthStart(reference);
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear();
    return Array.from({ length: 11 }, (_, index) => currentYear - index);
  }, []);

  const updateVisibleMonth = useCallback((year: number, month: number) => {
    let safeYear = year;
    let safeMonth = month;

    if (safeYear > today.getFullYear()) {
      safeYear = today.getFullYear();
      safeMonth = today.getMonth();
    } else if (safeYear === today.getFullYear() && safeMonth > today.getMonth()) {
      safeMonth = today.getMonth();
    }

    setVisibleMonth(getMonthStart(new Date(safeYear, safeMonth, 1)));
  }, []);

  const canNavigateNext = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    return year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());
  }, [visibleMonth]);

  useEffect(() => {
    // Ensure parent sees default range when no values provided
    if (!startDate || !endDate) {
      onDateRangeChange(defaultRange.start, defaultRange.end);
    }
  }, [defaultRange.end, defaultRange.start, endDate, onDateRangeChange, startDate]);

  const calculateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = 300;
    const dropdownWidth = 300;

    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const spaceRight = viewportWidth - buttonRect.right;
    const spaceLeft = buttonRect.left;

    const newPosition = spaceBelow >= dropdownHeight ? 'bottom' : spaceAbove >= dropdownHeight ? 'top' : 'bottom';

    const verticalOffset = 6;
    const horizontalOffset = 0;

    let top = newPosition === 'bottom'
      ? buttonRect.bottom + verticalOffset
      : buttonRect.top - dropdownHeight - verticalOffset;

    top = Math.min(Math.max(top, verticalOffset), viewportHeight - dropdownHeight - verticalOffset);

    let left: number;
    if (spaceRight >= dropdownWidth + horizontalOffset) {
      const candidate = buttonRect.right + horizontalOffset;
      left = Math.min(candidate, viewportWidth - dropdownWidth - horizontalOffset);
    } else if (spaceLeft >= dropdownWidth + horizontalOffset) {
      const candidate = buttonRect.left - dropdownWidth - horizontalOffset;
      left = Math.max(candidate, horizontalOffset);
    } else {
      const centered = buttonRect.left + (buttonRect.width - dropdownWidth) / 2;
      left = Math.min(Math.max(centered, horizontalOffset), viewportWidth - dropdownWidth - horizontalOffset);
    }

    setDropdownCoordinates({
      top,
      left,
    });
  }, []);

  const isFutureDate = useCallback((date: Date) => date.getTime() > today.getTime(), []);

  const getDaysInMonth = useCallback((month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingWeekDay = firstDay.getDay();

    const days: Array<Date | null> = [];

    for (let i = 0; i < startingWeekDay; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, monthIndex, day));
    }

    return days;
  }, []);

  const isDateInRange = useCallback((date: Date) => {
    if (!tempStart || !tempEnd) return false;
    return date >= tempStart && date <= tempEnd;
  }, [tempEnd, tempStart]);

  const isDateInHoverRange = useCallback((date: Date) => {
    if (!tempStart || tempEnd || selectingStart || !hoverDate) return false;
    if (hoverDate < tempStart) return false;
    return date >= tempStart && date <= hoverDate;
  }, [hoverDate, selectingStart, tempEnd, tempStart]);

  const handleDateClick = useCallback((date: Date) => {
    if (isFutureDate(date)) return;

    if (selectingStart || !tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
      setSelectingStart(false);
      setHoverDate(null);
      return;
    }

    if (date < tempStart) {
      setTempStart(date);
      setTempEnd(null);
      setSelectingStart(false);
      setHoverDate(null);
      return;
    }

    let endCandidate = date;
    if (maxDays > 0) {
      const diffMs = endCandidate.getTime() - tempStart.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > maxDays - 1) {
        endCandidate = new Date(tempStart);
        endCandidate.setDate(endCandidate.getDate() + maxDays - 1);
        if (isFutureDate(endCandidate)) {
          endCandidate = new Date(today);
        }
      }
    }

    setTempEnd(endCandidate);
    setSelectingStart(true);
    setHoverDate(null);
    onDateRangeChange(formatDateToString(tempStart), formatDateToString(endCandidate));
  }, [isFutureDate, maxDays, onDateRangeChange, selectingStart, tempEnd, tempStart]);

  const formattedDisplay = useMemo(() => {
    if (tempStart && tempEnd) {
      return `${formatDateForDisplay(formatDateToString(tempStart))} - ${formatDateForDisplay(formatDateToString(tempEnd))}`;
    }
    if (tempStart) {
      return `${formatDateForDisplay(formatDateToString(tempStart))} - ${formatDateForDisplay(effectiveEnd)}`;
    }
    return `${formatDateForDisplay(effectiveStart)} - ${formatDateForDisplay(effectiveEnd)}`;
  }, [effectiveEnd, effectiveStart, tempEnd, tempStart]);

  useEffect(() => {
    setTempStart(effectiveStart ? new Date(effectiveStart) : null);
    setTempEnd(effectiveEnd ? new Date(effectiveEnd) : null);
  }, [effectiveEnd, effectiveStart]);

  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();
    }
  }, [calculateDropdownPosition, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        setHoverDate(null);
      }
    };

    const handleResize = () => calculateDropdownPosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [calculateDropdownPosition, isOpen]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'next' && !canNavigateNext) {
      return;
    }

    const offset = direction === 'next' ? 1 : -1;
    const nextMonth = new Date(visibleMonth);
    nextMonth.setMonth(visibleMonth.getMonth() + offset);
    updateVisibleMonth(nextMonth.getFullYear(), nextMonth.getMonth());
  };

  const handleMonthSelect = useCallback((monthIndex: number) => {
    updateVisibleMonth(visibleMonth.getFullYear(), monthIndex);
  }, [updateVisibleMonth, visibleMonth]);

  const handleYearSelect = useCallback((year: number) => {
    updateVisibleMonth(year, visibleMonth.getMonth());
  }, [updateVisibleMonth, visibleMonth]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const days = getDaysInMonth(visibleMonth);
  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const todayYearValue = today.getFullYear();
  const todayMonthIndex = today.getMonth();
  const selectableYears = useMemo(() => {
    const uniqueYears = new Set<number>(yearOptions);
    uniqueYears.add(visibleYear);
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [visibleYear, yearOptions]);

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            setSelectingStart(true);
            setTempStart(effectiveStart ? new Date(effectiveStart) : null);
            setTempEnd(effectiveEnd ? new Date(effectiveEnd) : null);
            setHoverDate(null);
            const endReference = effectiveEnd ? new Date(effectiveEnd) : today;
            updateVisibleMonth(endReference.getFullYear(), endReference.getMonth());
          }
        }}
        className="flex w-full items-center justify-between border-0 border-b-2 border-gray-300 bg-transparent px-1.5 py-2 text-sm text-slate-700 transition-colors focus:outline-none focus:border-blue-600 hover:border-blue-500"
      >
        <span className="text-sm text-slate-700">{formattedDisplay}</span>
        <svg
          className="ml-2 h-4 w-4 text-blue-500"
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
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          style={{
            minWidth: '280px',
            top: dropdownCoordinates.top,
            left: dropdownCoordinates.left,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleMonthChange('prev')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-3 text-sm">
              <select
                value={visibleMonthIndex}
                onChange={(event) => handleMonthSelect(Number(event.target.value))}
                className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                {monthNames.map((name, index) => {
                  const isDisabled = visibleYear === todayYearValue && index > todayMonthIndex;
                  return (
                    <option key={name} value={index} disabled={isDisabled}>
                      {name.toUpperCase()}
                    </option>
                  );
                })}
              </select>

              <select
                value={visibleYear}
                onChange={(event) => handleYearSelect(Number(event.target.value))}
                className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                {selectableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleMonthChange('next')}
              disabled={!canNavigateNext}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
            {dayNames.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1 font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1" onMouseLeave={() => setHoverDate(null)}>
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-8" />;
              }

              const isDisabled = isFutureDate(day);
              const isStart = tempStart && day.toDateString() === tempStart.toDateString();
              const isEnd = tempEnd && day.toDateString() === tempEnd.toDateString();
              const inRange = isDateInRange(day);
              const hoverRange = isDateInHoverRange(day);
              const isTodayDate = day.toDateString() === today.toDateString();

              let className =
                'h-8 w-8 rounded-full text-xs flex items-center justify-center transition-colors ';

              if (isDisabled) {
                className += 'bg-gray-100 text-gray-300 cursor-not-allowed';
              } else if (isStart || isEnd) {
                className += 'bg-blue-500 text-white font-medium';
              } else if (inRange) {
                className += 'bg-blue-100 text-blue-700';
              } else if (hoverRange) {
                className += 'bg-blue-50 text-blue-700';
              } else if (isTodayDate) {
                className += 'border border-blue-300 text-blue-600';
              } else {
                className += 'text-gray-700 hover:bg-gray-100';
              }

              return (
                <button
                  key={`${day.toISOString()}-${index}`}
                  type="button"
                  disabled={isDisabled}
                  className={className}
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => {
                    if (!isDisabled && !selectingStart && tempStart && !tempEnd) {
                      setHoverDate(day);
                    }
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default SingleMonthDateRangePicker;
