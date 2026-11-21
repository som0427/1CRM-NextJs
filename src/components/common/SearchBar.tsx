import React, { useState, useRef, useCallback } from "react";
import { Search } from "lucide-react";

/**
 * SearchBar Component
 *
 * A versatile search input component with multiple visual variants.
 * Supports static, expandable, and circular-expandable styles.
 *
 * @component
 *
 * @example
 * // Static search bar (default)
 * <SearchBar
 *   searchTerm={searchTerm}
 *   setSearchTerm={setSearchTerm}
 *   handleSearch={handleSearch}
 * />
 *
 * @example
 * // Expandable search bar
 * <SearchBar
 *   searchTerm={searchTerm}
 *   setSearchTerm={setSearchTerm}
 *   handleSearch={handleSearch}
 *   variant="expandable"
 * />
 *
 * @example
 * // Circular expandable (icon only until focused)
 * <SearchBar
 *   searchTerm={searchTerm}
 *   setSearchTerm={setSearchTerm}
 *   handleSearch={handleSearch}
 *   variant="circular-expandable"
 * />
 *
 * @example
 * // With blue border
 * <SearchBar
 *   searchTerm={searchTerm}
 *   setSearchTerm={setSearchTerm}
 *   handleSearch={handleSearch}
 *   border="blue"
 * />
 *
 * Props:
 * ------
 * @param {string} searchTerm - Current search value (required)
 * @param {(val: string) => void} setSearchTerm - Callback to update search value (required)
 * @param {() => void} handleSearch - Callback triggered on Enter key (required)
 * @param {"static" | "expandable" | "circular-expandable"} [variant="static"] - Visual variant
 * @param {"gray" | "blue"} [border="gray"] - Border color (for static variant)
 *
 * Variants:
 * ---------
 * - "static": Fixed width (220px), always visible input
 * - "expandable": Expands from 160px to 220px on focus
 * - "circular-expandable": Circle icon that expands to full input on focus
 *
 * Features:
 * ---------
 * - Blue search icon (lucide-react)
 * - Enter key triggers search
 * - Smooth expand/collapse animations (300ms)
 * - Dynamic border color on focus (blue) for expandable variants
 * - Rounded pill/circular design
 * - White background with shadow (static variant)
 */
interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  handleSearch: () => void;
  variant?: "static" | "expandable" | "circular-expandable";
  border?: "gray" | "blue";
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  handleSearch, 
  variant = "static", 
  border = "gray"
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isExpanded = isFocused || searchTerm.length > 0;

  // Memoized handlers
  const handleContainerClick = useCallback(() => {
    if ((variant === "expandable" || variant === "circular-expandable") && inputRef.current) {
      inputRef.current.focus();
    }
  }, [variant]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Determine border class
  // Rule: For expandable and circular-expandable, default gray; turn blue when focused or text is present
  const isExpandableVariant = variant === "expandable" || variant === "circular-expandable";
  const dynamicBorderClass = isExpanded || isFocused ? "border border-blue-400" : "border border-gray-200";
  const borderClass = isExpandableVariant 
    ? dynamicBorderClass 
    : border === "blue" 
      ? "border border-blue-400" 
      : "border border-gray-200";

  // Common input props
  const commonInputProps = {
    ref: inputRef,
    type: "text" as const,
    value: searchTerm,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && handleSearch(),
    className: "border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
  };

  // Render based on variant
  switch (variant) {
    case "circular-expandable":
      return (
        <div className="relative">
          <div 
            className={`flex items-center rounded-full ${borderClass} bg-white transition-all duration-300 ease-in-out cursor-pointer ${
              isExpanded ? 'h-10 w-[220px] px-4' : 'h-10 w-10 justify-center'
            }`}
            onClick={handleContainerClick}
          >
            <Search className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <input
              {...commonInputProps}
              className={`${commonInputProps.className} transition-all duration-300 ease-in-out ${
                isExpanded ? 'flex-1 ml-3 opacity-100' : 'w-0 ml-0 opacity-0 pointer-events-none'
              }`}
              placeholder="Search..."
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>
      );

    case "expandable":
      return (
        <div className="relative">
          <div
            className={`flex h-10 items-center rounded-full ${borderClass} bg-white transition-all duration-300 ease-in-out cursor-pointer px-4 overflow-hidden`}
            style={{ width: isExpanded ? 220 : 160 }}
            onClick={handleContainerClick}
          >
            <Search className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <input
              {...commonInputProps}
              className={`${commonInputProps.className} flex-1 ml-3`}
              placeholder={isExpanded ? "Search..." : "Search"}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>
      );

    case "static":
    default:
      return (
        <div className="relative">
          <div className={`flex h-10 w-[220px] items-center rounded-full ${borderClass} bg-white px-3 shadow-sm`}>
            <Search className="h-4 w-4 text-blue-500" />
            <input
              {...commonInputProps}
              className={`${commonInputProps.className} flex-1 p-1.5 pl-2`}
              placeholder="Search..."
            />
          </div>
        </div>
      );
  }
};

export default SearchBar;
