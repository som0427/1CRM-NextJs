import React, { useCallback } from 'react';
import { Control } from 'react-hook-form';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    addCarouselItem,
    updateCarouselItem,
    removeCarouselItem,
    reorderCarouselItems,
} from '@/store/uploadCreativeSlice';
import UploadInput from '@/components/common/input-fields/UploadInput';
import TextInput from '@/components/common/input-fields/TextInput';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

interface CarouselTabProps {
    control: Control<any>;
    projectId?: number | null;
}

const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

const CarouselTab: React.FC<CarouselTabProps> = ({ control, projectId }) => {
    const dispatch = useAppDispatch();
    const carouselItems = useAppSelector((state) => state.uploadCreative.carouselItems);

    const handleAddItem = () => {
        dispatch(addCarouselItem());
    };

    const handleRemoveItem = (id: string) => {
        dispatch(removeCarouselItem(id));
    };

    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;
        dispatch(reorderCarouselItems({
            sourceIndex: result.source.index,
            destinationIndex: result.destination.index,
        }));
    }, [dispatch]);

    return (
        <div className="space-y-4">
            {/* Info text */}
            <p className="text-xs text-gray-500">
                Max 5 Carousels can be added | Best Fit Resolution: 720x330 px
            </p>

            {/* Carousel Items with Drag and Drop */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="carousel-list">
                    {(provided) => (
                        <div
                            className="space-y-4"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {carouselItems.map((item, index) => (
                                <Draggable key={item._trackingId} draggableId={item._trackingId} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`border border-gray-200 rounded-lg px-4 pt-3 pb-5 ${snapshot.isDragging ? 'shadow-lg bg-blue-50 border-dashed border-blue-300' : ''}`}
                                            style={{ ...provided.draggableProps.style }}
                                        >
                                            <div className="space-y-3">
                                                {/* Row 1: Upload File */}
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
                                                            <UploadInput
                                                                name={`carouselImage_${item._trackingId}`}
                                                                control={control}
                                                                attributeTypeId={CustomAttributeTypeEnum.IMAGE}
                                                                customAcceptedTypes={['image/jpeg', 'image/png']}
                                                                customFileExtensions={['.jpg', '.jpeg', '.png']}
                                                                moduleType={2}
                                                                projectId={projectId ?? undefined}
                                                                maxSize={1 * 1024 * 1024}
                                                                hint={<>
                                                                    Max File Size: 1 MB | Image Type: .jpeg, .png file only
                                                                </>}
                                                                iconSize="sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-[20%] flex justify-end pt-1">
                                                        <div className="flex flex-col gap-1">
                                                            {carouselItems.length > 1 && (
                                                                <RemoveActionButton
                                                                    id={index}
                                                                    onRemove={() => handleRemoveItem(item._trackingId)}
                                                                    className="h-6 w-6"
                                                                />
                                                            )}
                                                            {index === carouselItems.length - 1 && carouselItems.length < 5 && (
                                                                <AddActionButton
                                                                    onAdd={handleAddItem}
                                                                    className="h-6 w-6"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 2: URL */}
                                                <div className="flex gap-3 items-start">
                                                    <div className="w-[20%]" />
                                                    <div className="w-[57%] min-w-0 grid grid-cols-12 gap-4 items-start">
                                                        <label className="col-span-4 text-sm font-medium text-gray-700 whitespace-nowrap pt-1">
                                                            URL
                                                        </label>
                                                        <div className="col-span-8 min-w-0">
                                                            <TextInput
                                                                name={`carouselUrl_${item._trackingId}`}
                                                                control={control}
                                                                placeholder="Enter URL..."
                                                                maxLength={50}
                                                                showCharacterCount={true}
                                                                validationRules={{
                                                                    pattern: {
                                                                        value: URL_PATTERN,
                                                                        message: 'Enter a valid link',
                                                                    },
                                                                }}
                                                                onChange={(value) => {
                                                                    dispatch(updateCarouselItem({
                                                                        _trackingId: item._trackingId,
                                                                        updates: { url: value },
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-[20%]" />
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

export default CarouselTab;
