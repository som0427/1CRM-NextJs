import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import StatusCell from '../common/StatusCell';
import { ProductFormData } from '@/lib/models/productFormModels';
import EditActionButton from '@/components/common/buttons/action-button/EditActionButton';
import DeleteActionButton from '@/components/common/buttons/action-button/DeleteActionButton';
import { ROW_DRAG_ICON } from "@/lib/constants/gridIcons.constant";

// Separate component to avoid re-renders during drag
const ActionsCellRenderer: React.FC<{
  data: ProductFormData;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
  deleteLoadingId?: number | null;
}> = ({ data, onEdit, onDelete, deleteLoadingId }) => {
  if (!data) return null;
  const canDelete = data.anyTransactionPerformed === false;
  
  return (
    <div className="flex items-center justify-center w-full h-full gap-2">
      <div className="w-6 h-6">
        <EditActionButton className='w-6 h-6' id={data.id} onEdit={() => onEdit(data.id)} variant="new" />
      </div>
      <div className="w-6 h-6">
        {canDelete ? (
          <DeleteActionButton
            className='w-6 h-6'
            id={data.id}
            onClick={onDelete}
            loading={deleteLoadingId === data.id}
            disabled={deleteLoadingId !== null && deleteLoadingId !== data.id}
          />
        ) : (
          <div className="w-6 h-6" /> // Empty placeholder for alignment
        )}
      </div>
    </div>
  );
};

interface ProductFormDataGridProps {
  data: ProductFormData[];
  dynamicColumns: { field: string; headerName: string; attributeType: number }[];
  searchText?: string;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
  onReorder?: (items: ProductFormData[]) => void;
  deleteLoadingId?: number | null;
}

const ProductFormDataGrid: React.FC<ProductFormDataGridProps> = ({
  data,
  dynamicColumns,
  searchText,
  onEdit,
  onDelete,
  onReorder,
  deleteLoadingId
}) => {
  const gridRef = useRef<AgGridReact<ProductFormData>>(null);
  const [rowData, setRowData] = useState<ProductFormData[]>([]);
  const trimmedSearchText = (searchText ?? '').trim();
  const isRowDragDisabled = trimmedSearchText.length > 0;
  const isReorderingRef = useRef(false);

  useEffect(() => {
    // Skip updating rowData if we just reordered (to prevent flicker)
    if (isReorderingRef.current) {
      isReorderingRef.current = false;
      return;
    }
    setRowData(Array.isArray(data) ? data : []);
  }, [data]);

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setQuickFilter(searchText || '');
    }
  }, [searchText]);

  // Stable refs for callbacks to prevent column re-creation
  const onEditRef = useRef(onEdit);
  const onDeleteRef = useRef(onDelete);
  const deleteLoadingIdRef = useRef(deleteLoadingId);
  
  useEffect(() => {
    onEditRef.current = onEdit;
    onDeleteRef.current = onDelete;
    deleteLoadingIdRef.current = deleteLoadingId;
  }, [onEdit, onDelete, deleteLoadingId]);

  const actionsCellRenderer = useCallback(
    (params: any) => {
      const form = params.data as ProductFormData | undefined;
      if (!form) return null;
      return (
        <ActionsCellRenderer
          data={form}
          onEdit={onEditRef.current}
          onDelete={onDeleteRef.current}
          deleteLoadingId={deleteLoadingIdRef.current}
        />
      );
    },
    []
  );

  const nameCellRenderer = useCallback((params: any) => {
    const value = params.value || '(Product Form Name)';
    return <span className="text-sm font-medium text-slate-900">{value}</span>;
  }, []);

  const columnDefs = useMemo<ColDef<ProductFormData>[]>(() => {
    const baseCols: ColDef<ProductFormData>[] = dynamicColumns.map((col) => {
      const isNameColumn = col.field === 'name';
      const definition: ColDef<ProductFormData> = {
        field: col.field,
        headerName: col.headerName,
        flex: isNameColumn ? 16 : 2,
        minWidth: isNameColumn ? 550 : 180,
        sortable: true,
        filter: true,
        suppressSizeToFit: true,
        rowDrag: isNameColumn && !isRowDragDisabled
      };

      if (isNameColumn) {
        definition.cellRenderer = nameCellRenderer;
      }
      return definition;
    });

    baseCols.push({
      headerName: 'Status',
      field: 'status',
      flex: 2,
      minWidth: 180,
      headerComponent: () => <GridHeaderCenterCell label="Status" />,
      cellRenderer: StatusCell,
      suppressSizeToFit: true
    });

    baseCols.push({
      headerName: 'Actions',
      field: 'actions',
      flex: 2,
      minWidth: 180,
      cellRenderer: actionsCellRenderer,
      headerComponent: () => <GridHeaderCenterCell label="Actions" />,
            suppressSizeToFit: true,
      sortable: false,
      filter: false,
      resizable: false
    });

    return baseCols;
  }, [dynamicColumns, nameCellRenderer, isRowDragDisabled]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 120,
      suppressMovable: true,
      cellClass: 'text-sm text-slate-800'
    }),
    []
  );

  const handleRowDragEnd = useCallback(() => {
    if (isRowDragDisabled) return;

    const api = gridRef.current?.api;
    if (!api) return;

    const updatedRows: ProductFormData[] = [];
    const displayedRowCount = api.getDisplayedRowCount();

    for (let i = 0; i < displayedRowCount; i += 1) {
      const node = api.getDisplayedRowAtIndex(i);
      if (node?.data) {
        updatedRows.push(node.data);
      }
    }

    if (updatedRows.length) {
      setRowData(updatedRows);
      isReorderingRef.current = true; // Flag to skip next data sync
      onReorder?.(updatedRows);
    }
  }, [onReorder, isRowDragDisabled]);

  const gridOptions = useMemo<GridOptions<ProductFormData>>(
    () => ({
      pagination: false,
      animateRows: false,
      rowDragManaged: true,
      domLayout: 'normal',
      rowHeight: 42,
      headerHeight: 48,
      icons: {
        rowDrag: ROW_DRAG_ICON
      },
      onRowDragEnd: handleRowDragEnd
    }),
    [handleRowDragEnd]
  );

  return (
    <div className="flex flex-col w-full h-[90%] overflow-auto">
      <div className="w-full h-full ag-theme-alpine">
        <AgGridReact<ProductFormData>
          ref={gridRef}
          gridOptions={gridOptions}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          suppressRowClickSelection
          className="w-full flex-1 ag-theme-alpine"
        />
      </div>
    </div>
  );
};

export default ProductFormDataGrid;
