import React, { useCallback } from 'react';
import { Control } from 'react-hook-form';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    addBannerItem,
    removeBannerItem,
    reorderBannerItems,
    setVisibilityBehaviour,
} from '@/store/uploadCreativeSlice';
import BannerUploadInput from '@/components/upload-creative/sub-components/BannerUploadInput';
import Select from '@/components/common/input-fields/Select';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';

interface BannerTabProps {
    control: Control<any>;
    projectId?: number | null;
}

// Values are the API contract for visibilityBehaviour. 'Off' stays last as the
// disable option, so the new frequency sits with the other frequencies.
const visibilityOptions = [
    { value: '0', label: 'After Every Login' },
    { value: '1', label: 'Once a Day' },
    { value: '3', label: 'App Opening' },
    { value: '2', label: 'Off' },
];

const BannerTab: React.FC<BannerTabProps> = ({ control, projectId }) => {
    const dispatch = useAppDispatch();
    const bannerItems = useAppSelector((state) => state.uploadCreative.bannerItems);

    const handleAddItem = () => {
        dispatch(addBannerItem());
    };

    const handleRemoveItem = (id: string) => {
        dispatch(removeBannerItem(id));
    };

    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;
        dispatch(reorderBannerItems({
            sourceIndex: result.source.index,
            destinationIndex: result.destination.index,
        }));
    }, [dispatch]);

    return (
        <div className="space-y-4">
            {/* Visibility Behaviour */}
            <div className="grid grid-cols-12 gap-4 items-center">
                <label className="col-span-3 text-sm font-medium text-gray-700">
                    Visibility Behaviour
                </label>
                <div className="col-span-5">
                    <Select
                        name="visibilityBehaviour"
                        control={control}
                        options={visibilityOptions}
                        placeholder="Select visibility behaviour..."
                        onChange={(value) => {
                            dispatch(setVisibilityBehaviour(value));
                        }}
                    />
                </div>
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-500">
                Max 5 Banners can be added | Best Fit Resolution: 720x1080 px
            </p>

            {/* Banner Items with Drag and Drop */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="banner-list">
                    {(provided) => (
                        <div
                            className="space-y-4"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {bannerItems.map((item, index) => (
                                <Draggable key={item._trackingId} draggableId={item._trackingId} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`border border-gray-200 rounded-lg px-4 pt-3 pb-5 ${snapshot.isDragging ? 'shadow-lg bg-blue-50 border-dashed border-blue-300' : ''}`}
                                            style={{ ...provided.draggableProps.style }}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className="w-[20%] flex items-center">
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="cursor-grab active:cursor-grabbing text-[#3699FF] hover:text-blue-700"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="3" y1="6" x2="21" y2="6"></line>
                                                            <line x1="3" y1="12" x2="21" y2="12"></line>
                                                            <line x1="3" y1="18" x2="21" y2="18"></line>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="w-[57%] min-w-0 grid grid-cols-12 gap-4 items-start">
                                                    <label className="col-span-4 text-sm font-medium text-gray-700 whitespace-nowrap pt-1">
                                                        Upload File<span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="col-span-8 min-w-0">
                                                        <BannerUploadInput
                                                            name={`bannerFile_${item._trackingId}`}
                                                            control={control}
                                                            moduleType={2}
                                                            projectId={projectId ?? undefined}
                                                            hint={<>
                                                                Image: 1 MB - .jpeg, .png file only | Video: 5 MB - .mp4, .mpeg, .mov file only
                                                            </>}
                                                            iconSize="sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-[20%] flex justify-end pt-1">
                                                    <div className="flex flex-col gap-1">
                                                        {bannerItems.length > 1 && (
                                                            <RemoveActionButton
                                                                id={index}
                                                                onRemove={() => handleRemoveItem(item._trackingId)}
                                                                className="h-6 w-6"
                                                            />
                                                        )}
                                                        {index === bannerItems.length - 1 && bannerItems.length < 5 && (
                                                            <AddActionButton
                                                                onAdd={handleAddItem}
                                                                className="h-6 w-6"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
};

export default BannerTab;
