import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import StatusCell from "../common/StatusCell";
import GridHeaderCenterCell from "../common/GridHeaderCenterCell";
import { AttributeGridData } from "@/lib/api/attributeApi";
import AttributeActionsCell from "./sub-components/AttributeActionsCell";
import Spinner from "../common/Spinner";
import NoRecordsFound from "../common/NoRecordsFound";
import { useSnackbar } from "notistack";
import settingsService from "@/lib/services/settingsService";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { setAttributes as setAttributesToRedux } from "@/store/attributeSlice";
import { SystemAttributeEnum } from "@/lib/constants/SystemAttributeEnum.constant";
import { ROW_DRAG_ICON } from "@/lib/constants/gridIcons.constant";

export interface AttributesListDataGridHandle {
  reload: () => Promise<void>;
  getDisplayOrderPayload: () => Array<{
    id: number;
    attributeName: string;
    displayOrder: number;
  }>;
}

interface AttributesListDataGridProps {
  onGridReady?: (gridApi: GridApi) => void;
  onEditAttribute?: (id: number) => void;
  onViewFieldAccess?: (id: number) => void;
  projectId: number;
  moduleType: number;
  searchTerm?: string;
  onHandlersChange?: (handlers: AttributesListDataGridHandle | null) => void;
}

const AttributesListDataGrid: React.FC<AttributesListDataGridProps> = ({
  onGridReady,
  onEditAttribute,
  onViewFieldAccess,
  projectId,
  moduleType,
  searchTerm = "",
  onHandlersChange,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch<AppDispatch>();
  const fetchControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [attributes, setAttributes] = useState<AttributeGridData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [attributeVisibilityMap, setAttributeVisibilityMap] = useState<Record<number, string>>({});

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchControllerRef.current?.abort('Abort Request: Component unmounted');
    };
  }, []);


  // Fetch attributes from API
  const loadAttributes = useCallback(async () => {
    fetchControllerRef.current?.abort('Abort Request: New request started');
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    // Skip visibility fetch for User module (moduleType 5)
    const shouldFetchVisibility = moduleType !== SystemAttributeEnum.USER_MODULE;

    setLoading(true);
    try {
      const { fetchAttributes: fetchAttributesApi, fetchAttributeTypeList } = await import("@/lib/api/attributeApi");

      // Fetch attributes, visibility settings, and attribute types in parallel
      const [data, visibilityResponse, attributeTypesResponse] = await Promise.all([
        fetchAttributesApi(projectId, moduleType, controller.signal),
        shouldFetchVisibility
          ? settingsService.getFieldVisibilitySettings(projectId, moduleType, false, controller.signal)
          : Promise.resolve({ responseData: [], statusCode: 200, message: '' }),
        fetchAttributeTypeList(moduleType, controller.signal),
      ]);

      // Find the linked type name (attribute type with id 13)
      const LINKED_ATTRIBUTE_TYPE_ID = 13;
      const attributeTypes = attributeTypesResponse || [];
      const linkedType = attributeTypes.find((type: any) => type.id === LINKED_ATTRIBUTE_TYPE_ID);


      const visibilityMap = (visibilityResponse?.responseData || []).reduce(
        (map: Record<number, string>, item: any) => {
          if (item?.attributeId) {
            map[item.attributeId] = item.visibility || "Custom";
          }
          return map;
        },
        {}
      );
      if (isMountedRef.current && fetchControllerRef.current === controller) {
        setAttributeVisibilityMap(visibilityMap);
      }

      if (!isMountedRef.current || fetchControllerRef.current !== controller) {
        return;
      }

      // For User module: Handle Set Password Checkbox (59) and Password field (60) hierarchy
      // Password field should be a child of Set Password Checkbox
      let setPasswordParentName: string | null = null;
      let passwordFieldIndex: number | null = null;

      data.forEach((attr: any, index: number) => {
        if (attr.systemAttribute?.id === SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID) {
          // Store parent name for Set Password Checkbox (id: 59)
          setPasswordParentName = attr.attributeName;
        } else if (attr.systemAttribute?.id === SystemAttributeEnum.USER_PASSWORD_FIELD_ID) {
          // Mark Password field (id: 60) index to update its path later
          passwordFieldIndex = index;
        }
      });

      // Process the flat array of attributes for AG-Grid tree data
      // The API already provides the path array, we just need to transform and use it
      const transformedData = data.map((attr: any, index: number) => {
        // Handle Password field path - add Set Password Checkbox as parent
        let attrPath = Array.isArray(attr.path) && attr.path.length > 0
          ? [...attr.path]
          : [attr.attributeName || attr.fieldName || `Item_${attr.id}`];

        // If this is the Password field and we found the Set Password parent, prepend parent name to path
        if (index === passwordFieldIndex && setPasswordParentName) {
          attrPath.unshift(setPasswordParentName);
        }

        // Determine field type to display:
        // 1. Special case for Set Password Checkbox → show 'CheckBox'
        // 2. If linkedAttributeId exists AND no systemAttribute → show linkedTypeName
        // 3. Otherwise show attributeType.typeName
        let fieldTypeDisplay = attr.attributeType?.typeName || '(Field-Type)';

        if (attr?.systemAttribute?.id === SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID) {
          fieldTypeDisplay = 'CheckBox';
        } else if (
          attr.linkedAttributeId != null &&
          attr.linkedAttributeId !== '' &&
          !attr.systemAttribute?.id &&
          linkedType?.typeName
        ) {
          fieldTypeDisplay = linkedType?.typeName;
        }

        return {
          ...attr,
          id: attr.id,
          fieldName: attr.attributeName || '(Field Name)',
          fieldType: fieldTypeDisplay,
          mandatory: attr.mandatoryFlag === 1 ? 'Yes' : 'No',
          visibility: shouldFetchVisibility ? (visibilityMap[attr.id] || 'All') : '',
          status: attr.isActive === 1 ? "Active" : "Inactive",
          showSystemFieldStatus:
            typeof attr.showSystemFieldStatus === "boolean"
              ? attr.showSystemFieldStatus
              : attr.fieldSpec === 0 ||
              attr.fieldSpec === 5 ||
              attr.fieldSpec === "0" ||
              attr.fieldSpec === "5",
          // Use the processed path for tree hierarchy
          path: attrPath
        };
      });

      // Debug: Log some sample data to verify paths
      // console.log('Sample transformed data with paths:', transformedData.slice(0, 5).map(item => ({
      //   name: item.fieldName,
      //   path: item.path,
      //   hasChildren: item.hasChildAttribute
      // })));

      setAttributes(transformedData);
      // Also store in Redux for access on edit attribute screen
      dispatch(setAttributesToRedux(data));
    } catch (error) {
      // Silent handling for aborted requests (logged in apiClient)
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      if ((error as DOMException)?.name === 'AbortError' ||
          errorMessage.includes('Abort Request:')) {
        return;
      }
      console.error('Error fetching attributes:', error);
      if (isMountedRef.current && fetchControllerRef.current === controller) {
        enqueueSnackbar('Failed to load attributes', { variant: 'error' });
        setAttributes([]);
      }
    } finally {
      if (isMountedRef.current && fetchControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [projectId, moduleType, enqueueSnackbar]);

  const buildDisplayOrderPayload = useCallback(() => {
    if (!gridApi) return [];

    const orderData: {
      id: number;
      attributeName: string;
      displayOrder: number;
    }[] = [];

    let displayOrder = 1;
    gridApi.forEachNode((node) => {
      if (!node?.data) return;
      orderData.push({
        id: node.data.id,
        attributeName: node.data.attributeName || node.data.fieldName || "",
        displayOrder,
      });
      displayOrder += 1;
    });

    return orderData;
  }, [gridApi]);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  useEffect(() => {
    if (onHandlersChange) {
      onHandlersChange({
        reload: () => loadAttributes(),
        getDisplayOrderPayload: () => buildDisplayOrderPayload(),
      });
      return () => onHandlersChange(null);
    }
  }, [onHandlersChange, loadAttributes, buildDisplayOrderPayload]);

  // Use AG Grid quick filter for global search
  useEffect(() => {
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', searchTerm);
    }
  }, [searchTerm, gridApi]);

  // Show/hide loading overlay
  useEffect(() => {
    if (gridApi) {
      if (loading) gridApi.showLoadingOverlay();
      else gridApi.hideOverlay();
    }
  }, [loading, gridApi]);

  const defaultColDef: ColDef = {
    flex: 1,
    minWidth: 120,
    resizable: true,
    sortable: true,
    filter: true,
    cellClass: 'cell-ellipsis',
    suppressHeaderMenuButton: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
  };



  const handleEdit = useCallback((id: number) => {
    if (onEditAttribute) {
      onEditAttribute(id);
    }
  }, [onEditAttribute]);

  const handleView = useCallback((id: number) => {
    if (onViewFieldAccess) {
      onViewFieldAccess(id);
    }
  }, [onViewFieldAccess]);



  // Module types that should NOT show visibility column (User module = 5)
  const hideVisibilityColumn = moduleType === 5;

  const columnDefs: ColDef[] = useMemo(() => {
    const cols: ColDef[] = [
      // Field Name is handled by autoGroupColumnDef for tree data
      {
        field: 'fieldType',
        headerName: 'Field Type',
        sortable: true,
        flex: 1,
        minWidth: 280
      },
      {
        field: 'mandatory',
        headerName: 'Mandatory',
        sortable: true,
        width: 110
      },
    ];

    // Only add visibility column for modules that support it (not User module)
    if (!hideVisibilityColumn) {
      cols.push({
        field: 'visibility',
        headerName: 'Visibility',
        sortable: true,
        width: 110
      });
    }

    cols.push(
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        filter: true,
        width: 120,
        cellRenderer: StatusCell,
        headerComponent: (params: any) => (
          <GridHeaderCenterCell
            label="Status"
            showFilter={true}
            enableSorting={true}
            showColumnMenu={params.showColumnMenu}
            column={params.column}
            setSort={params.setSort}
          />
        )
      },
      {
        headerName: 'Actions',
        field: 'actions',
        cellRenderer: (params: any) => (
          <AttributeActionsCell
            data={params.data}
            onEdit={handleEdit}
            onView={moduleType !== SystemAttributeEnum.USER_MODULE ? handleView : undefined}
          />
        ),
        maxWidth: 150,
        sortable: false,
        filter: false,
        headerComponent: () => <GridHeaderCenterCell label="Actions" />
      }
    );

    return cols;
  }, [handleEdit, handleView, hideVisibilityColumn, moduleType]);

  // Grid ready handler
  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);

    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);

    if (onGridReady) onGridReady(params.api);
  }, [onGridReady]);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }, []);

  // Handle row drag end to enforce group constraints
  const onRowDragEnd = useCallback((event: any) => {
    const { node, overNode } = event;

    if (!node || !overNode) return;

    // Get the paths of the source and target nodes
    const sourcePath = node.data.path || [];
    const targetPath = overNode.data.path || [];

    // Check if they belong to the same parent group
    if (sourcePath.length !== targetPath.length) {
      // Different hierarchy levels - not allowed
      // Refresh the grid to revert the change
      gridApi?.refreshCells({ force: true });
      // loadAttributes(); // Reload to restore original order
      return;
    }

    // For items at the same level, check if they have the same parent path
    if (sourcePath.length > 1) {
      // Check if parent paths match (all elements except the last one)
      const sourceParent = sourcePath.slice(0, -1).join('/');
      const targetParent = targetPath.slice(0, -1).join('/');

      if (sourceParent !== targetParent) {
        // Different parent groups - not allowed
        enqueueSnackbar('Items can only be reordered within their parent group', { variant: 'warning' });
        // Refresh the grid to revert the change
        gridApi?.refreshCells({ force: true });
        loadAttributes(); // Reload to restore original order
        return;
      }
    }

    // If we get here, the drag is valid (same group)
    // The display order will be saved when the user clicks the save button
  }, [gridApi, enqueueSnackbar, loadAttributes]);

  // Grid options for AG Grid with drag-and-drop enabled
  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: false, // Disable pagination to show all records
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'normal', // Normal layout with scrolling
    headerHeight: 48,
    suppressColumnVirtualisation: false,
    suppressRowHoverHighlight: false,
    rowDragManaged: true, // Enable row drag management
    groupDefaultExpanded: -1, // Expand all groups by default (-1 means all levels)
    treeData: true, // Enable tree data
    getDataPath: (data: any) => {
      // Use the path array from the data to define the hierarchy
      return data.path || [data.fieldName];
    },
    groupDisplayType: 'singleColumn', // Use single column for tree display
    icons: {
      rowDrag: ROW_DRAG_ICON,
    },
    autoGroupColumnDef: {
      headerName: 'Field Name',
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: (params: any) => {
          // Display the last element of the path as the name
          const path = params.data?.path || [];
          return path.length > 0 ? path[path.length - 1] : params.data?.fieldName || '';
        }
      },
      flex: 1,
      minWidth: 300,
      rowDrag: true, // Enable row dragging on the group column
    },
    onRowDragEnd: onRowDragEnd,
  }), [onRowDragEnd]);

  if (loading) {
    return <Spinner />;
  }

  if (attributes.length === 0) {
    return <NoRecordsFound heading="Attributes" />;
  }

  return (
    <div className="flex flex-col w-full h-[90%] overflow-auto">
      <div className="w-full h-full ag-theme-alpine">
        <AgGridReact
          gridOptions={gridOptions}
          rowData={attributes}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={handleGridReady}
          suppressRowClickSelection={true}
          suppressRowTransform={true}
          rowDragManaged={true}
          domLayout="normal"
          rowSelection="single"
          overlayNoRowsTemplate="No records found"
          loadingOverlayComponent={loadingOverlayComponent}
          loadingOverlayComponentParams={{
            loadingMessage: 'Loading Attributes...'
          }}
          rowHeight={48}
        />
      </div>
    </div>
  );
};

export default AttributesListDataGrid;
