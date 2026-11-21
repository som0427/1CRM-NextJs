"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { OpportunityGridViewModel } from '../../lib/models/opportunity/opportunity-grid-view/opportunity-grid-view.model';
import { OpportunityDetails } from '../../lib/models/opportunity/opportunity-grid-view/opportunity-details.model';
import { format } from 'date-fns';
import { getProjectId } from '@/lib/storage/sharedStorage';
import opportunityService from '@/lib/services/opportunityService';
import { useSnackbar } from 'notistack';

interface OpportunityGridViewProps {
  opportunities: OpportunityGridViewModel[];
  loading: boolean;
  dynamicColumns?: {field: string, headerName: string}[]; // Add dynamicColumns prop
  onOpportunityView: (opportunityId:number) => void;
  onOpportunityEdit: (opportunityId: number) => void;
  
}

export const OpportunityGridView: React.FC<OpportunityGridViewProps> = ({
  opportunities,
  loading,
  onOpportunityView,
  onOpportunityEdit,
  dynamicColumns = []
}) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [groupedOpportunities, setGroupedOpportunities] = useState<Record<string, OpportunityDetails[]>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!opportunities || opportunities.length === 0) {
      setGroupedOpportunities({});
      return;
    }
    
    const grouped: Record<string, OpportunityDetails[]> = {};
    
    // Process OpportunityGridViewModel[] structure
    opportunities.forEach(gridViewModel => {
      const statusKey = gridViewModel.status || 'Unknown';
      
      if (!grouped[statusKey]) {
        grouped[statusKey] = [];
      }
      
      // Add all opportunities from this status group
      if (gridViewModel.oppDetails && Array.isArray(gridViewModel.oppDetails)) {
        grouped[statusKey].push(...gridViewModel.oppDetails);
      }
    });
    
    setGroupedOpportunities(grouped);
  }, [opportunities]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
  
    if (!destination) return; // Dropped outside a valid droppable
  
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return; // Dropped in the same place
    }
  
    const startColumnId = source.droppableId;
    const finishColumnId = destination.droppableId;
  
    const originalGrouped = JSON.parse(JSON.stringify(groupedOpportunities)); // Deep clone
  
    const startColumn = Array.from(groupedOpportunities[startColumnId] || []);
    const [movedOpportunity] = startColumn.splice(source.index, 1);
  
    if (!movedOpportunity) return;
  
    const updatedOpportunity = { ...movedOpportunity, status: finishColumnId };
  
    const newGrouped = { ...groupedOpportunities };
  
    if (startColumnId === finishColumnId) {
      // Same column reorder
      startColumn.splice(destination.index, 0, updatedOpportunity);
      newGrouped[startColumnId] = startColumn;
    } else {
      // Moving to different column
      newGrouped[startColumnId] = startColumn;
  
      const finishColumn = Array.from(groupedOpportunities[finishColumnId] || []);
      finishColumn.splice(destination.index, 0, updatedOpportunity);
      newGrouped[finishColumnId] = finishColumn;
    }
  
    // Optimistically update UI
    setGroupedOpportunities(newGrouped);
  
    // Get statusId for new column
    let targetStatusId = null;
    const targetStatusInfo = opportunities.find(o => o.status === finishColumnId);
    if (targetStatusInfo) {
      targetStatusId = targetStatusInfo.statusId;
    }
  
    if (!movedOpportunity.opportunityId || !targetStatusId) {
      enqueueSnackbar('Missing required data to update status', { variant: 'error' });
      setGroupedOpportunities(originalGrouped); // ❗️Rollback
      return;
    }
  
    const projectId = getProjectId();
    const updateData = {
      projectId: projectId,
      opportunityId: movedOpportunity.opportunityId,
      attributeId: movedOpportunity.statusAttributeId,
      lookupValueId: targetStatusId.toString(),
    };
  
    setIsUpdating(true);
  
    opportunityService.updateOpportunityStatus(updateData)
      .then(response => {
        if (response.statusCode === 200) {
          enqueueSnackbar('Updated successfully', { variant: 'success' });
        } else {
          enqueueSnackbar('Failed to update status: ' + response.message, { variant: 'error' });
          setGroupedOpportunities(originalGrouped); // Rollback
        }
      })
      .catch(() => {
        enqueueSnackbar('Error occurred', { variant: 'error' });
        setGroupedOpportunities(originalGrouped); // Rollback
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  // Get background color for avatar based on index
  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-orange-500', // orange
      'bg-blue-500',   // blue
      'bg-gray-500',   // gray
      'bg-green-500',  // green
      'bg-purple-500', // purple
    ];
    return colors[index % colors.length];
  };
  

  
  // Define the preferred order of statuses - including all possible statuses from API
  const statusOrder = useMemo(() => [
    'Active',
    'In Progress',
    'Connected',
    'Credentials Presented',
    'Negotiation',
    'Won',
    'Lost',
    'Closed'
  ], []);
  
  // Define column background gradients using stageId (number)
  const getColumnBackground = (stageId: number) => {
    switch (stageId) {
      case 2: // Won
        return 'linear-gradient(to bottom, rgba(27, 197, 189) 0px, rgba(255, 255, 255, 0.5) 300px, rgba(255, 255, 255, 0.2) 600px)';
      case 3: // Lost
        return 'linear-gradient(to bottom, rgba(246, 78, 96) 0px, rgba(255, 255, 255, 0.5) 300px, rgba(255, 255, 255, 0.2) 600px)';
      default:
        return 'linear-gradient(to bottom, rgba(54, 153, 255) 0px, rgba(255, 255, 255, 0.5) 300px, rgba(255, 255, 255, 0.2) 600px)';
    }
  };
  
  // Define card gradient colors
  const getCardGradient = (status: string) => {
    switch (status) {
      case 'Won': 
        return 'linear-gradient(to bottom,rgba(27, 197, 189, 0.05) 25px, white 25px)';
      case 'Lost': 
        return 'linear-gradient(to bottom,rgba(246, 78, 95, 0.03) 25px, white 25px)';
      default: 
        return 'linear-gradient(to bottom,rgba(54, 155, 255, 0.05) 25px, white 25px)';
    }
  };
  
  // Define header colors for each status
  const getHeaderColor = (stageId: number) => {
    switch (stageId) {
      case 2: // Won
        return 'bg-green-500';
      case 3: // Lost
        return 'bg-red-500';
      default: 
        return 'bg-blue-500';
    }
  };
  
  // Filter and sort statuses based on the defined order, return array of { status, stageId }
  const sortedStatuses = useMemo(() => {
    const statusMap: Record<string, number> = {};
    opportunities.forEach(o => {
      if (o.status && typeof o.stageId === 'number') {
        statusMap[o.status] = o.stageId;
      }
    });

    return Object.keys(groupedOpportunities)
      .sort((a, b) => {
        const indexA = statusOrder.indexOf(a);
        const indexB = statusOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      })
      .map(status => ({ status, stageId: statusMap[status] || 0 }));
  }, [groupedOpportunities, statusOrder, opportunities]);
  
  // Find the column with the maximum number of opportunities
  const maxOpportunityCount = useMemo(() => {
    if (Object.keys(groupedOpportunities).length === 0) {
      return 0;
    }
    const counts = Object.values(groupedOpportunities).map(ops => ops.length);
    return Math.max(...counts, 0); // Ensure Math.max doesn't get called with an empty array if all groups are empty
  }, [groupedOpportunities]);
  
  // Calculate approximate height based on maximum opportunities
  // Each card is about 120px tall + 12px margin-bottom
  const baseColumnHeight = 50; // header height
  const cardHeight = 132; // card height + margin
  const estimatedMaxHeight = baseColumnHeight + (maxOpportunityCount * cardHeight);

  return (
    <>
      {/* Global spinner for API calls - appears in center of screen */}
      {isUpdating && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Main container with overflow-x-auto to control horizontal scrolling for both header and content */}
          <div className="h-full w-full bg-white overflow-x-auto">
            {/* Inner content that will be horizontally scrollable */}
            <div style={{ minWidth: 'max-content' }}>
              {/* Headers row - always visible */}
              <div className="flex sticky top-0 z-20" style={{ paddingLeft: 0 }}>
                {sortedStatuses.map(({ status, stageId }) => (
                  <div 
                    key={`header-${status}`}
                    className="flex-1" 
                    style={{ marginRight: '0.5rem', minWidth: '250px' }}
                  >
                    <div 
                      className={`${getHeaderColor(stageId)} w-full`}
                      style={{ 
                        borderTopLeftRadius: '0.75rem',
                        borderTopRightRadius: '0.75rem'
                      }}
                    >
                      <div className="flex items-center text-white px-2 py-1">
                        <div className="flex items-center px-2 py-0.5">
                          <h3 className="text-white text-md font-normal whitespace-nowrap" title={status}>
                            {status.length > 25 ? `${status.substring(0, 25)}...` : status}
                          </h3>
                          <div className="ml-1.5 bg-white bg-opacity-20 text-white text-md font-normal px-1.5 rounded-full">
                            {(groupedOpportunities[status] || []).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Container for fixed backgrounds and scrollable content */}
              <div className="flex-1 relative" style={{ height: 'calc(100vh - 10rem)' }}> {/* More responsive height calculation */}
                {/* Fixed background layer - does not scroll */}
                <div className="absolute inset-0 flex z-0">
                  {sortedStatuses.map(({ status, stageId }) => (
                    <div 
                      key={`bg-${status}`}
                      className="flex-1" 
                      style={{ 
                        marginRight: '0.5rem', 
                        minWidth: '250px',
                        background: getColumnBackground(stageId)
                      }}
                    />
                  ))}
                </div>
                
                {/* Scrollable content layer - scrolls over the fixed background */}
                <div className="absolute inset-0 overflow-y-auto z-10">
                  <div className="flex" style={{ minHeight: '100%' }}>
                    {sortedStatuses.map(({ status, stageId }) => (
                      <div 
                        key={status}
                        className="flex-1" 
                        style={{ 
                          marginRight: '0.5rem', 
                          minWidth: '250px',
                          height: '100%',
                          background: 'transparent'
                        }}
                      >
                        <Droppable droppableId={status}>
                          {(providedDroppable, snapshotDroppable) => (
                            <div
                              ref={providedDroppable.innerRef}
                              {...providedDroppable.droppableProps}
                              className={`flex-1 ${snapshotDroppable.isDraggingOver ? 'bg-blue-200 bg-opacity-30' : ''}`}
                              style={{ 
                                minHeight: '100%'
                              }}
                            >
                              {(groupedOpportunities[status] || []).map((opportunity, cardIndex) => (
                                <Draggable draggableId={opportunity.opportunityId.toString()} index={cardIndex} key={opportunity.opportunityId.toString()}>
                                  {(providedDraggable, snapshotDraggable) => (
                              <div 
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                {...providedDraggable.dragHandleProps}
                                className={`bg-white border border-gray-200 p-2 cursor-pointer mt-2 mb-2 ml-2 mr-2 ${snapshotDraggable.isDragging ? 'opacity-80 shadow-md ring-2 ring-blue-500' : ''}`}
                                onClick={() => router.push(`/opportunity-dashboard/${opportunity.opportunityId}`)}
                                role="button"
                                aria-label={`View details for ${opportunity.opportunityName}`}
                                style={{
                                  ...providedDraggable.draggableProps.style,
                                  borderRadius:'0.5rem',
                                }}
                              >
                                {/* Title */}
                                <div className="mb-2">
                                  <h4 className="text-gray-700 text-sm font-medium">{opportunity.opportunityName}</h4>
                                </div>

                               {/* Customer row */}
                               <div className="flex items-center mb-1.5">
                                  <svg className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={status === 'Won' ? '#10B981' : status === 'Lost' ? '#EF4444' : '#3B82F6'} />
                                        <stop offset="100%" stopColor="#A1A1AA" />
                                      </linearGradient>
                                    </defs>
                                    <path d="M3 21H21M3 18H21M8 11H16M8 7H16M19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4Z" stroke="url(#buildingGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  <div className="text-xs text-gray-600 mb-1">{opportunity.customerName || 'No Customer'}</div>
                                </div> 

                                {/* Percentage row */}
                                <div className="flex items-center mb-1.5">
                                  <svg className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="percentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={status === 'Won' ? '#10B981' : status === 'Lost' ? '#EF4444' : '#3B82F6'} />
                                        <stop offset="100%" stopColor="#A1A1AA" />
                                      </linearGradient>
                                    </defs>
                                    <path d="M19.4001 9C19.7917 9 20.1374 8.75667 20.2618 8.38658C20.3862 8.01649 20.2622 7.61358 19.9501 7.4L12.5501 3.4C12.214 3.18978 11.786 3.18978 11.4501 3.4L4.05006 7.4C3.73794 7.61358 3.61383 8.01649 3.73823 8.38658C3.86263 8.75667 4.2083 9 4.60006 9H19.4001Z" fill="url(#percentGradient)"/>
                                    <path d="M6.80006 11H11.0001V17H6.80006C6.35823 17 6.00006 16.6418 6.00006 16.2V11.8C6.00006 11.3582 6.35823 11 6.80006 11Z" fill="url(#percentGradient)"/>
                                    <path d="M13.0001 17V11H17.2001C17.6419 11 18.0001 11.3582 18.0001 11.8V16.2C18.0001 16.6418 17.6419 17 17.2001 17H13.0001Z" fill="url(#percentGradient)"/>
                                    <path d="M20.0001 21H4.00006C3.44778 21 3.00006 20.5523 3.00006 20V19C3.00006 18.4477 3.44778 18 4.00006 18H20.0001C20.5523 18 21.0001 18.4477 21.0001 19V20C21.0001 20.5523 20.5523 21 20.0001 21Z" fill="url(#percentGradient)"/>
                                  </svg>
                                  <span className="text-xs text-gray-500">{opportunity.winProbability ? opportunity.winProbability.toString() : '0'}%</span>
                                </div>
                                
                                {/* Value row */}
                                <div className="flex items-center mb-1.5">
                                  <svg className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="valueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={status === 'Won' ? '#10B981' : status === 'Lost' ? '#EF4444' : '#3B82F6'} />
                                        <stop offset="100%" stopColor="#A1A1AA" />
                                      </linearGradient>
                                    </defs>
                                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM9.97 9.47C9.97 10.2 10.54 10.69 12.31 11.14C14.07 11.6 15.5 12.18 15.5 13.93C15.5 14.85 14.85 15.64 13.75 15.97V17H11.25V15.95C10.14 15.59 9.43 14.73 9.41 13.64H10.89C10.91 14.06 11.25 14.44 12 14.44C12.8 14.44 13.06 14.06 13.06 13.83C13.06 13.22 12.5 12.91 10.87 12.45C9.11 11.97 7.53 11.44 7.53 9.67C7.53 8.75 8.22 7.87 9.41 7.56V6.5H11.91V7.58C12.94 7.95 13.63 8.75 13.66 9.77H12.19C12.18 9.34 11.89 9.09 11.25 9.09C10.56 9.09 9.97 9.33 9.97 9.47Z" fill="url(#valueGradient)"/>
                                  </svg>
                                  <span className="text-xs text-gray-600">{opportunity.value ? opportunity.value.toLocaleString() : '0'}</span>
                                </div>
                                
                                {/* Owner row */}
                                <div className="flex items-center mb-1.5">
                                  <svg className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                      <linearGradient id="paint0_linear_1605_29073" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#3B82F6"/>
                                        <stop offset="1" stopColor="#2563EB"/>
                                      </linearGradient>
                                    </defs>
                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="url(#paint0_linear_1605_29073)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="url(#paint0_linear_1605_29073)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  <span className="text-gray-700 text-xs">{opportunity.ownerName || 'Not Assigned'}</span>
                                </div>
                                
                                {/* Expected close date */}
                                <div className="flex items-center mb-1.5">
                                  <svg className="h-3 w-3 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 2V6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M8 2V6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M3 10H21" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  <span className="text-xs text-gray-600">{opportunity.expectedClosureDate || 'Not set'}</span>
                                </div>

                                {/* Owner */}
                                <div className="flex pt-1 mt-1 border-t border-gray-100">
                                  <div className="flex items-center">
                                    <div className="h-4 w-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-white text-[9px]">
                                      {opportunity.ownerName ? opportunity.ownerName.charAt(0) : '?'}
                                    </div>
                                    <span className="text-xs text-gray-600 ml-1">{opportunity.ownerName || 'Not assigned'}</span>
                                  </div>
                                </div>
                              </div>
                                  )}
                                </Draggable>
                              ))}
                              {providedDroppable.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DragDropContext>
      )}
    </>
  );

};

export default OpportunityGridView;
