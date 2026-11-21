import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import { TailwindPageLayout } from '@/components/layout/TailwindPageLayout';
import PageHeading from '@/components/common/PageHeading';
import AddButton from '@/components/common/buttons/AddButton';
import EditActionButton from '@/components/common/buttons/action-button/EditActionButton';
import GridHeaderCenterCell from '@/components/common/GridHeaderCenterCell';
import StatusCell from '@/components/common/StatusCell';
import SearchBar from '@/components/common/SearchBar';
import VerticalDivider from '@/components/common/VerticalDivider';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridOptions, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import DemoActivityModal from '@/components/demo/DemoActivityModal';

interface DemoActivityData {
  id: number;
  serialNumber: string;
  activityName: string;
  customerName: string;
  customerId: string;
  activityStatus: number; // 1 = Active, 2 = Inactive
  auditMonth: string;
  productCategories: string[];
  productCategoryValues: string[];
  totalProducts: number;
  products: any[];
  jobDetails: {
    jobsPerMonth: number;
    metallicShadesJobs: number;
    totalPanelPerMonth: number;
    panelsPerMonth: number;
  };
  createdAt: string;
}

// Action Cell Renderer Component
const ActionsCellRenderer: React.FC<{ data: DemoActivityData; onEdit: (id: number) => void }> = ({ data, onEdit }) => {
  return (
    <div className="flex items-center justify-center w-full h-full gap-1">
      <EditActionButton
        id={data.id}
        onEdit={onEdit}
        variant="new"
      />
    </div>
  );
};

// Default activities data
const DEFAULT_ACTIVITIES: DemoActivityData[] = [
  {
    id: 1,
    serialNumber: 'DEMO001',
    activityName: 'Paint Audit Q1',
    customerName: 'ABC Auto Body Shop',
    customerId: 'cust_001',
    activityStatus: 1,
    auditMonth: '2024-01-15',
    productCategories: ['Putty', 'Primer'],
    productCategoryValues: ['putty', 'primer'],
    totalProducts: 4,
    products: [
      { productCategory: 'Putty', skuCode: 'PUT001', productDescription: 'Quick Dry Putty 1kg', popularCode: 'QDP1K', packSize: 1000, materialWtWithTin: '1050', sealedPackInUnits: '10', unitsPurchased: '25' },
      { productCategory: 'Putty', skuCode: 'PUT002', productDescription: 'Premium Putty 500g', popularCode: 'PP500', packSize: 500, materialWtWithTin: '525', sealedPackInUnits: '20', unitsPurchased: '30' },
      { productCategory: 'Primer', skuCode: 'PRM001', productDescription: 'Auto Primer Grey 1L', popularCode: 'APG1L', packSize: 1000, materialWtWithTin: '1100', sealedPackInUnits: '12', unitsPurchased: '18' },
      { productCategory: 'Primer', skuCode: 'PRM002', productDescription: 'High Build Primer 500ml', popularCode: 'HBP500', packSize: 500, materialWtWithTin: '550', sealedPackInUnits: '24', unitsPurchased: '36' },
    ],
    jobDetails: { jobsPerMonth: 45, metallicShadesJobs: 12, totalPanelPerMonth: 180, panelsPerMonth: 150 },
    createdAt: '1/5/2024, 10:30:00 AM',
  },
  {
    id: 2,
    serialNumber: 'DEMO002',
    activityName: 'Coating Inspection',
    customerName: 'XYZ Paint Works',
    customerId: 'cust_002',
    activityStatus: 1,
    auditMonth: '2024-02-20',
    productCategories: ['Thinner', 'Clear Coat'],
    productCategoryValues: ['thinner', 'clearcoat'],
    totalProducts: 4,
    products: [
      { productCategory: 'Thinner', skuCode: 'THN001', productDescription: 'NC Thinner 1L', popularCode: 'NCT1L', packSize: 1000, materialWtWithTin: '950', sealedPackInUnits: '12', unitsPurchased: '40' },
      { productCategory: 'Thinner', skuCode: 'THN002', productDescription: 'PU Thinner 500ml', popularCode: 'PUT500', packSize: 500, materialWtWithTin: '475', sealedPackInUnits: '24', unitsPurchased: '60' },
      { productCategory: 'Clear Coat', skuCode: 'CLR001', productDescription: 'Gloss Clear Coat 1L', popularCode: 'GCC1L', packSize: 1000, materialWtWithTin: '1080', sealedPackInUnits: '6', unitsPurchased: '15' },
      { productCategory: 'Clear Coat', skuCode: 'CLR002', productDescription: 'Matte Clear Coat 500ml', popularCode: 'MCC500', packSize: 500, materialWtWithTin: '540', sealedPackInUnits: '12', unitsPurchased: '20' },
    ],
    jobDetails: { jobsPerMonth: 60, metallicShadesJobs: 25, totalPanelPerMonth: 240, panelsPerMonth: 200 },
    createdAt: '2/10/2024, 2:15:00 PM',
  },
  {
    id: 3,
    serialNumber: 'DEMO003',
    activityName: 'Material Review',
    customerName: 'Premium Auto Finishers',
    customerId: 'cust_003',
    activityStatus: 0,
    auditMonth: '2024-03-10',
    productCategories: ['Base Coat', 'Putty'],
    productCategoryValues: ['basecoat', 'putty'],
    totalProducts: 4,
    products: [
      { productCategory: 'Base Coat', skuCode: 'BSC001', productDescription: 'Metallic Base Silver 1L', popularCode: 'MBS1L', packSize: 1000, materialWtWithTin: '1120', sealedPackInUnits: '6', unitsPurchased: '12' },
      { productCategory: 'Base Coat', skuCode: 'BSC002', productDescription: 'Solid Base White 500ml', popularCode: 'SBW500', packSize: 500, materialWtWithTin: '560', sealedPackInUnits: '12', unitsPurchased: '24' },
      { productCategory: 'Putty', skuCode: 'PUT001', productDescription: 'Quick Dry Putty 1kg', popularCode: 'QDP1K', packSize: 1000, materialWtWithTin: '1050', sealedPackInUnits: '10', unitsPurchased: '15' },
      { productCategory: 'Putty', skuCode: 'PUT002', productDescription: 'Premium Putty 500g', popularCode: 'PP500', packSize: 500, materialWtWithTin: '525', sealedPackInUnits: '20', unitsPurchased: '22' },
    ],
    jobDetails: { jobsPerMonth: 30, metallicShadesJobs: 18, totalPanelPerMonth: 120, panelsPerMonth: 100 },
    createdAt: '3/5/2024, 9:00:00 AM',
  },
  {
    id: 4,
    serialNumber: 'DEMO004',
    activityName: 'Quality Check',
    customerName: 'City Motors Refinish',
    customerId: 'cust_004',
    activityStatus: 1,
    auditMonth: '2024-04-05',
    productCategories: ['Primer', 'Thinner', 'Clear Coat'],
    productCategoryValues: ['primer', 'thinner', 'clearcoat'],
    totalProducts: 6,
    products: [
      { productCategory: 'Primer', skuCode: 'PRM001', productDescription: 'Auto Primer Grey 1L', popularCode: 'APG1L', packSize: 1000, materialWtWithTin: '1100', sealedPackInUnits: '12', unitsPurchased: '28' },
      { productCategory: 'Primer', skuCode: 'PRM002', productDescription: 'High Build Primer 500ml', popularCode: 'HBP500', packSize: 500, materialWtWithTin: '550', sealedPackInUnits: '24', unitsPurchased: '45' },
      { productCategory: 'Thinner', skuCode: 'THN001', productDescription: 'NC Thinner 1L', popularCode: 'NCT1L', packSize: 1000, materialWtWithTin: '950', sealedPackInUnits: '12', unitsPurchased: '55' },
      { productCategory: 'Thinner', skuCode: 'THN002', productDescription: 'PU Thinner 500ml', popularCode: 'PUT500', packSize: 500, materialWtWithTin: '475', sealedPackInUnits: '24', unitsPurchased: '70' },
      { productCategory: 'Clear Coat', skuCode: 'CLR001', productDescription: 'Gloss Clear Coat 1L', popularCode: 'GCC1L', packSize: 1000, materialWtWithTin: '1080', sealedPackInUnits: '6', unitsPurchased: '22' },
      { productCategory: 'Clear Coat', skuCode: 'CLR002', productDescription: 'Matte Clear Coat 500ml', popularCode: 'MCC500', packSize: 500, materialWtWithTin: '540', sealedPackInUnits: '12', unitsPurchased: '30' },
    ],
    jobDetails: { jobsPerMonth: 75, metallicShadesJobs: 35, totalPanelPerMonth: 300, panelsPerMonth: 250 },
    createdAt: '4/1/2024, 11:45:00 AM',
  },
];

const DemoActivitiesPage: NextPage = () => {
  const gridRef = useRef<AgGridReact>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DemoActivityData | null>(null);
  const [activities, setActivities] = useState<DemoActivityData[]>(DEFAULT_ACTIVITIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const handleOpenAddModal = useCallback(() => {
    setIsEditMode(false);
    setEditingActivity(null);
    setIsModalOpen(true);
  }, []);

  const handleEditActivity = useCallback((id: number) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      setEditingActivity(activity);
      setIsEditMode(true);
      setIsModalOpen(true);
    }
  }, [activities]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingActivity(null);
  }, []);

  const handleSaveActivity = useCallback((activityData: DemoActivityData) => {
    if (isEditMode && editingActivity) {
      // Update existing activity
      setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...activityData, id: editingActivity.id } : a));
    } else {
      // Add new activity
      setActivities(prev => [...prev, activityData]);
    }
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingActivity(null);
  }, [isEditMode, editingActivity]);

  const handleSaveAndAddNew = useCallback((activityData: DemoActivityData) => {
    if (isEditMode && editingActivity) {
      // Update existing and close edit mode
      setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...activityData, id: editingActivity.id } : a));
      setIsEditMode(false);
      setEditingActivity(null);
    } else {
      // Add new activity
      setActivities(prev => [...prev, activityData]);
    }
    // Modal stays open for adding new (handled in modal)
  }, [isEditMode, editingActivity]);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
  }, []);

  const handleSearch = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setQuickFilter(searchTerm);
    }
  }, [searchTerm]);

  // Apply quick filter when searchTerm changes
  useEffect(() => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  }, [searchTerm, gridApi]);

  // Handle window resize to fit columns
  useEffect(() => {
    const handleResize = () => {
      if (gridApi) {
        gridApi.sizeColumnsToFit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridApi]);

  const gridOptions: GridOptions = useMemo(() => ({
    animateRows: true,
    suppressCellFocus: true,
    domLayout: 'normal',
    rowHeight: 48,
    headerHeight: 48,
    onGridSizeChanged: (params) => {
      params.api.sizeColumnsToFit();
    },
  }), []);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'serialNumber',
      headerName: 'Serial No.',
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: 'auditMonth',
      headerName: 'Audit Date',
      flex: 1.5,
      minWidth: 150,
      sortable: true,
      valueFormatter: (params: any) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      },
    },
    {
      field: 'customerName',
      headerName: 'Customer Name',
      flex: 2,
      minWidth: 200,
      sortable: true,
    },
    {
      field: 'activityStatus',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      maxWidth: 150,
      sortable: true,
      cellRenderer: StatusCell,
      headerComponent: GridHeaderCenterCell,
      headerComponentParams: { label: 'Status', enableSorting: true },
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 150,
      minWidth: 100,
      maxWidth: 150,
      sortable: false,
      filter: false,
      resizable: false,
      headerComponent: GridHeaderCenterCell,
      headerComponentParams: { label: 'Actions' },
      cellRenderer: (params: any) => (
        <ActionsCellRenderer
          data={params.data}
          onEdit={handleEditActivity}
        />
      ),
    },
  ], [handleEditActivity]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    filter: true,
    sortable: true,
  }), []);

  return (
    <Layout>
      <Head>
        <title>Activities | Demo</title>
      </Head>

      <TailwindPageLayout
        header={
          <div className="flex justify-between py-4 items-center">
            <PageHeading heading="Demo Activities" />
            <div className="flex items-center gap-4">
              <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleSearch={handleSearch}
                border="blue"
                variant="expandable"
              />
              <VerticalDivider />
              <AddButton
                pageHeading="Add New Demo Activity"
                handleOpenAddModal={handleOpenAddModal}
              />
            </div>
          </div>
        }
      >
        {/* Data Grid */}
        <div className="flex w-full flex-col grid-height-190">
          <div className="flex-1 w-full ag-theme-alpine">
            <div className="relative h-full w-full">
              <AgGridReact
                ref={gridRef}
                gridOptions={gridOptions}
                rowData={activities}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onGridReady={handleGridReady}
                suppressRowClickSelection={true}
                suppressDragLeaveHidesColumns={true}
                enableCellTextSelection={false}
                overlayNoRowsTemplate="No records found"
              />
            </div>
          </div>
        </div>
      </TailwindPageLayout>

      {/* Demo Activity Modal */}
      <DemoActivityModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveActivity}
        onSaveAndAddNew={handleSaveAndAddNew}
        existingActivitiesCount={activities.length}
        isEditMode={isEditMode}
        editingActivity={editingActivity}
      />
    </Layout>
  );
};

export default DemoActivitiesPage;
