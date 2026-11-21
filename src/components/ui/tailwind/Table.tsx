import React, { useState } from 'react';
import { cn } from '../../../lib/utils';

export interface TableColumn<T> {
  key: string;
  title: React.ReactNode;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number | string;
  className?: string;
  sorter?: boolean | ((a: T, b: T) => number);
  sortDirections?: Array<'ascend' | 'descend'>;
  fixed?: 'left' | 'right';
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  dataSource: T[];
  rowKey?: string | ((record: T) => string);
  className?: string;
  loading?: boolean;
  bordered?: boolean;
  pagination?: {
    pageSize?: number;
    current?: number;
    total?: number;
    onChange?: (page: number, pageSize: number) => void;
  } | false;
  onChange?: (pagination: any, filters: any, sorter: any) => void;
  scroll?: {
    x?: number | string;
    y?: number | string;
  };
  size?: 'small' | 'middle' | 'large';
  emptyText?: React.ReactNode;
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLTableRowElement>;
}

/**
 * Table component - A Tailwind CSS replacement for Ant Design Table
 */
export function Table<T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = 'key',
  className,
  loading = false,
  bordered = false,
  pagination = { pageSize: 10, current: 1 },
  onChange,
  scroll,
  size = 'middle',
  emptyText = 'No data',
  onRow,
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(null);

  // Handle sorting
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sorter) return;

    let newOrder: 'ascend' | 'descend' | null = 'ascend';
    if (sortColumn === column.key) {
      if (sortOrder === 'ascend') {
        newOrder = 'descend';
      } else if (sortOrder === 'descend') {
        newOrder = null;
      }
    }

    setSortColumn(newOrder ? column.key : null);
    setSortOrder(newOrder);

    if (onChange) {
      onChange(
        pagination,
        {},
        {
          column,
          order: newOrder,
          field: column.key,
          columnKey: column.key,
        }
      );
    }
  };

  // Sort data if needed
  let sortedData = [...dataSource];
  if (sortColumn && sortOrder) {
    const column = columns.find(col => col.key === sortColumn);
    
    if (column && column.sorter && typeof column.sorter === 'function') {
      sortedData.sort((a, b) => {
        const result = (column.sorter as Function)(a, b);
        return sortOrder === 'ascend' ? result : -result;
      });
    } else if (column && column.sorter === true && column.dataIndex) {
      sortedData.sort((a, b) => {
        const aValue = a[column.dataIndex as string];
        const bValue = b[column.dataIndex as string];
        const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortOrder === 'ascend' ? result : -result;
      });
    }
  }

  // Calculate pagination
  const currentPageData = pagination
    ? sortedData.slice(
        ((pagination.current || 1) - 1) * (pagination.pageSize || 10),
        (pagination.current || 1) * (pagination.pageSize || 10)
      )
    : sortedData;

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] ? String(record[rowKey]) : String(index);
  };

  // Generate sort icon based on current sort state
  const renderSortIcon = (column: TableColumn<T>) => {
    if (!column.sorter) return null;

    const isActive = sortColumn === column.key;
    
    return (
      <span className="ml-2 inline-flex flex-col">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="5"
          viewBox="0 0 10 5"
          fill="none"
          className={cn(
            "transition-colors",
            isActive && sortOrder === 'ascend' ? "fill-primary" : "fill-gray-400"
          )}
        >
          <path d="M5 0L10 5H0L5 0Z" />
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="5"
          viewBox="0 0 10 5"
          fill="none"
          className={cn(
            "transition-colors",
            isActive && sortOrder === 'descend' ? "fill-primary" : "fill-gray-400"
          )}
        >
          <path d="M5 5L0 0H10L5 5Z" />
        </svg>
      </span>
    );
  };

  // Size classes
  const sizeClasses = {
    small: 'text-xs py-1.5 px-2',
    middle: 'text-sm py-2.5 px-4',
    large: 'text-base py-3 px-6'
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Scroll container */}
      <div 
        className={cn(
          "w-full overflow-auto",
          scroll?.y ? 'max-h-[500px]' : ''
        )}
        style={scroll?.y ? { maxHeight: scroll.y } : {}}
      >
        <table
          className={cn(
            "w-full border-collapse table-auto",
            bordered ? "border border-gray-200" : "",
            className
          )}
          style={{ minWidth: scroll?.x }}
        >
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "font-semibold text-gray-700 text-left",
                    column.sorter ? "cursor-pointer select-none" : "",
                    bordered ? "border border-gray-200" : "border-b border-gray-200",
                    sizeClasses[size],
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sorter && handleSort(column)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {column.sorter && renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
                  <div className="flex justify-center items-center">
                    <svg className="animate-spin h-5 w-5 text-primary mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : currentPageData.length > 0 ? (
              currentPageData.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className="hover:bg-gray-50 transition-colors"
                  {...(onRow ? onRow(record, index) : {})}
                >
                  {columns.map((column) => (
                    <td
                      key={`${getRowKey(record, index)}-${column.key}`}
                      className={cn(
                        bordered ? "border border-gray-200" : "",
                        sizeClasses[size],
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(
                            column.dataIndex ? record[column.dataIndex] : null,
                            record,
                            index
                          )
                        : column.dataIndex 
                          ? record[column.dataIndex]
                          : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-4 text-gray-500"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex justify-end items-center mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <button
              className={cn(
                "px-3 py-1 rounded border border-gray-300 transition-colors",
                pagination.current === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50 active:bg-gray-100"
              )}
              onClick={() => {
                if (pagination.current !== 1 && pagination.onChange) {
                  pagination.onChange(pagination.current! - 1, pagination.pageSize || 10);
                }
              }}
              disabled={pagination.current === 1}
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {pagination.current} of{" "}
              {Math.ceil((pagination.total || dataSource.length) / (pagination.pageSize || 10))}
            </span>
            <button
              className={cn(
                "px-3 py-1 rounded border border-gray-300 transition-colors",
                pagination.current === Math.ceil((pagination.total || dataSource.length) / (pagination.pageSize || 10))
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50 active:bg-gray-100"
              )}
              onClick={() => {
                if (
                  pagination.current !== Math.ceil((pagination.total || dataSource.length) / (pagination.pageSize || 10)) &&
                  pagination.onChange
                ) {
                  pagination.onChange(pagination.current! + 1, pagination.pageSize || 10);
                }
              }}
              disabled={
                pagination.current === Math.ceil((pagination.total || dataSource.length) / (pagination.pageSize || 10))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
