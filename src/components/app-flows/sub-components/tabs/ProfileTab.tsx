import React, { Fragment, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    addSection,
    updateSection,
    deleteSection,
    setSelectedSection,
    addFieldToSection,
    updateFieldInSection,
    deleteFieldFromSection,
    setHasUnsavedChanges
} from '@/store/appflowSlice';
import TextInput from '@/components/common/input-fields/TextInput';
import Select from '@/components/common/input-fields/Select';
import HamburgerMenu from '@/components/common/HamburgerMenu';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';

interface Field {
    id: string;
    fieldName: string;
    fieldId: string;
    fieldValue: string;
    dataListId?: string;
}

interface Section {
    id: string;
    sectionId: number | null;
    name: string;
    status: string;
    fields: Field[];
}

interface FieldOption {
    value: string;
    label: string;
}

interface ProfileTabProps {
    fieldOptions: FieldOption[];
}

const ProfileTab: React.FC<ProfileTabProps> = ({ fieldOptions }) => {
    const dispatch = useAppDispatch();
    const flowDesigner = useAppSelector((state) => state.appflow.flowDesigner);
    const { control, watch, setValue, reset } = useForm();
    const [previousSectionId, setPreviousSectionId] = React.useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = React.useState(false);

    // Use Redux state instead of local state
    const sections = flowDesigner.sections;
    const selectedSection = flowDesigner.selectedSection;
    const currentSection = sections.find(s => s.id === selectedSection);

    // Handle section switching
    const handleSectionSelect = (sectionId: string) => {
        if (sectionId !== selectedSection) {
            // Start fade out animation first
            setIsTransitioning(true);

            // Wait for fade out, then switch section
            setTimeout(() => {
                dispatch(setSelectedSection(sectionId));
            }, 300);
        }
    };

    const statusOptions = [
        { value: '1', label: 'Active' },
        { value: '0', label: 'Inactive' }
    ];

    // Use field options from props (fetched from API)
    const allFieldOptions = fieldOptions;

    // Get available options for a specific field (excluding already selected ones in the same section)
    const getAvailableOptions = (currentFieldId: string, currentSectionId: string) => {
        const section = sections.find(s => s.id === currentSectionId);
        if (!section) return allFieldOptions;
        
        // Get all selected values in this section except the current field's value
        const selectedValues = section.fields
            .filter(field => field.id !== currentFieldId)
            .map(field => field.fieldId)
            .filter(type => type); // Remove empty values
        
        // Return options that haven't been selected in this section
        return allFieldOptions.filter(option => 
            !selectedValues.includes(option.value)
        );
    };

    const handleAddSection = () => {
        const sectionNumber = sections.length + 1;
        const newSectionId = `section-${Date.now()}`;
        const newField: Field = {
            id: `${newSectionId}-field-${Date.now()}`,
            fieldName: 'Field 1',
            fieldId: '',
            fieldValue: '',
        };
        const newSection: Section = {
            id: newSectionId,
            sectionId: null,
            name: `Section ${sectionNumber}`,
            status: '1',
            fields: [newField] // Each section starts with one field
        };
        dispatch(addSection(newSection));
        // Auto-select the new section (Redux action already handles this)
    };

    // Watch the section name field for changes with debouncing
    const watchedSectionName = watch(`section-name-${selectedSection}`);

    // Update section name in the sidebar when the input changes (with debouncing)
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (watchedSectionName !== undefined && selectedSection && currentSection) {
                // Only update if the value actually changed
                if (watchedSectionName !== currentSection.name) {
                    dispatch(updateSection({
                        id: selectedSection,
                        updates: { name: watchedSectionName }
                    }));
                }
            }
        }, 100); // Short debounce for better UX

        return () => clearTimeout(timeoutId);
    }, [watchedSectionName, selectedSection, dispatch, currentSection]);

    // Watch section status field for changes
    const watchedSectionStatus = watch(`section-status-${selectedSection}`);

    // Update section status in Redux when it changes
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (watchedSectionStatus !== undefined && selectedSection && currentSection) {
                // Only update if the value actually changed
                if (watchedSectionStatus !== currentSection.status) {
                    dispatch(updateSection({
                        id: selectedSection,
                        updates: { status: watchedSectionStatus }
                    }));
                }
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [watchedSectionStatus, selectedSection, dispatch, currentSection]);

    // Watch all field type changes
    const watchedFields = currentSection?.fields.map(field => ({
        id: field.id,
        fieldId: watch(`field-${field.id}-type`)
    })) || [];

    // Update field types in Redux when they change
    React.useEffect(() => {
        if (!currentSection || currentSection.id !== previousSectionId) {
            return; // Skip if we're in the middle of switching sections
        }

        const timeoutId = setTimeout(() => {
            watchedFields.forEach(({ id, fieldId }) => {
                const field = currentSection.fields.find(f => f.id === id);
                if (field && fieldId !== undefined && fieldId !== field.fieldId) {
                    dispatch(updateFieldInSection({
                        sectionId: currentSection.id,
                        fieldId: id,
                        updates: { fieldId: fieldId }
                    }));
                }
            });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [watchedFields.map(f => f.fieldId).join(','), currentSection, dispatch, previousSectionId]);

    // These handlers are now simplified since watch effects handle the Redux updates
    const handleSectionStatusChange = () => {
        // The watch effect will handle the Redux update automatically
    };

    const handleFieldChange = () => {
        // The watch effect will handle the Redux update automatically
    };

    const handleAddField = (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        if (!section) return;
        
        const fieldNumber = section.fields.length + 1;
        const newField: Field = {
            id: `${sectionId}-field-${Date.now()}`, // Unique ID per section
            fieldName: `Field ${fieldNumber}`,
            fieldId: '', // Start with empty type so user must select
            fieldValue: '',
        };
        
        dispatch(addFieldToSection({ sectionId, field: newField }));
    };

    const handleDeleteField = (sectionId: string, fieldId: string) => {
        dispatch(deleteFieldFromSection({ sectionId, fieldId }));
    };

    const handleDeleteSection = (sectionId: string) => {
        dispatch(deleteSection(sectionId));
    };

    // Initialize form and handle section switching - similar to CardConfigurationStep pattern
    React.useEffect(() => {
        // Only run when actually switching to a different section
        if (previousSectionId !== selectedSection) {
            // On initial mount or section change, load the current section data
            const sectionToLoad = sections.find(s => s.id === selectedSection);

            if (sectionToLoad) {
                // Reset the form with the new section's data
                reset({
                    [`section-name-${sectionToLoad.id}`]: sectionToLoad.name,
                    [`section-status-${sectionToLoad.id}`]: sectionToLoad.status,
                    ...Object.fromEntries(
                        sectionToLoad.fields.map(field => [`field-${field.id}-type`, field.fieldId])
                    )
                });

                // Update the previous section ID
                setPreviousSectionId(selectedSection);

                // Trigger fade in with NEW data
                requestAnimationFrame(() => {
                    setIsTransitioning(false);
                });
            }
        }
    }, [selectedSection, previousSectionId, reset, sections]);

    // Reset form when Redux store is reset (e.g., on cancel)
    React.useEffect(() => {
        // If flowDesigner is reset to initial state, reset the form and local state
        if (flowDesigner.flowName === '' && flowDesigner.selectedRole === '') {
            reset();
            setPreviousSectionId(null);
            
            // After reset, reinitialize with fresh Redux data if available
            if (sections.length > 0) {
                const firstSection = sections[0];
                setValue(`section-name-${firstSection.id}`, firstSection.name);
                setValue(`section-status-${firstSection.id}`, firstSection.status);
                firstSection.fields.forEach((field) => {
                    setValue(`field-${field.id}-type`, field.fieldId);
                });
                setPreviousSectionId(firstSection.id);
            }
        }
    }, [flowDesigner.flowName, flowDesigner.selectedRole, reset, sections, setValue]);

    return (
        <div className="flex h-full rounded-lg bg-gray-100 py-4">
            {/* Left Sidebar - Sections List */}
            <div className="w-80 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-4">
                    <div className="space-y-2">
                        {sections.map(section => (
                            <div
                                key={section.id}
                                className={`flex items-center gap-2 px-4 py-4 rounded-lg cursor-pointer transition-all duration-200 ease-in-out ${
                                    selectedSection === section.id
                                        ? 'bg-white shadow-sm scale-[1.02]'
                                        : 'hover:bg-gray-50'
                                }`}
                                onClick={() => handleSectionSelect(section.id)}
                            >
                                <HamburgerMenu 
                                    size={20}
                                />
                                <span className="flex-1 text-sm font-medium">
                                    {section.name || `Section ${sections.indexOf(section) + 1}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-3">
                    <button
                        onClick={handleAddSection}
                        className="w-full py-4 bg-[#3699FF] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                        Section
                    </button>
                </div>
            </div>

            {/* Vertical Divider */}
            <div className="w-px bg-gray-300"></div>

            {/* Right Content - Section Details */}
            <div className="flex-1 overflow-hidden flex flex-col h-full">
                {currentSection && (
                    <div
                        key={currentSection.id}
                        className={`flex flex-col h-full transition-opacity duration-300 ease-in-out ${
                            isTransitioning ? 'opacity-0' : 'opacity-100'
                        }`}
                    >
                        <div className="p-6 flex-1 overflow-y-auto">
                        {/* Section Header - Grid layout matching fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pb-6">
                            {/* Section Name */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium w-[100px] text-gray-700 whitespace-nowrap flex-shrink-0">
                                    Section Name
                                </label>
                                <div className="flex-1 min-w-0">
                                    <TextInput
                                        name={`section-name-${currentSection.id}`}
                                        control={control}
                                        placeholder="Enter section name"
                                        inputProps={{
                                            autoComplete: "off",
                                            autoCorrect: "off",
                                            autoCapitalize: "off",
                                            spellCheck: false
                                        }}
                                        maxWidth='w-full'
                                    />
                                </div>
                            </div>
                            {/* Section Status */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium w-[100px] text-gray-700 whitespace-nowrap flex-shrink-0">
                                    Section Status
                                </label>
                                <div className="flex-1 min-w-0">
                                    <Select
                                        name={`section-status-${currentSection.id}`}
                                        control={control}
                                        options={statusOptions}
                                        placeholder="Select status"
                                        onChange={handleSectionStatusChange}
                                        maxWidth='w-full'
                                    />
                                </div>
                            </div>
                            {/* Empty column for alignment on lg screens */}
                            <div className="hidden lg:block"></div>
                        </div>

                        {/* Fields Section - Same grid as header */}
                        <div className="space-y-4">
                                {currentSection.fields.length > 0 ? (
                                    <>
                                        {/* Field Grid - same columns as header */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                            {currentSection.fields.map((field, fieldIndex) => (
                                                <div key={field.id} className="flex items-center gap-3">
                                                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-[100px] flex-shrink-0">
                                                        Field {fieldIndex + 1}
                                                    </label>
                                                    <div className="flex-1 min-w-0">
                                                        <Select
                                                            name={`field-${field.id}-type`}
                                                            control={control}
                                                            options={getAvailableOptions(field.id, currentSection.id)}
                                                            placeholder="Select"
                                                            onChange={handleFieldChange}
                                                            maxWidth='w-full'
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Add/Remove buttons - spans remaining columns to right-align at grid edge */}
                                            {(() => {
                                                // Calculate remaining columns in current row for lg (3 cols) and md (2 cols)
                                                const fieldsCount = currentSection.fields.length;
                                                const lgRemainder = fieldsCount % 3;
                                                const mdRemainder = fieldsCount % 2;

                                                // Determine col-span classes based on remainder
                                                // lg: 0 fields in row -> span 3, 1 field -> span 2, 2 fields -> span 1
                                                // md: 0 fields in row -> span 2, 1 field -> span 1
                                                let colSpanClass = 'col-span-1'; // default for sm

                                                if (lgRemainder === 0) {
                                                    colSpanClass = 'col-span-1 md:col-span-2 lg:col-span-3';
                                                } else if (lgRemainder === 1) {
                                                    if (mdRemainder === 1) {
                                                        colSpanClass = 'col-span-1 md:col-span-1 lg:col-span-2';
                                                    } else {
                                                        colSpanClass = 'col-span-1 md:col-span-2 lg:col-span-2';
                                                    }
                                                } else if (lgRemainder === 2) {
                                                    if (mdRemainder === 0) {
                                                        colSpanClass = 'col-span-1 md:col-span-2 lg:col-span-1';
                                                    } else {
                                                        colSpanClass = 'col-span-1 md:col-span-1 lg:col-span-1';
                                                    }
                                                }

                                                return (
                                                    <div className={`flex items-center justify-end gap-1 ${colSpanClass}`}>
                                                        {fieldsCount > 1 && (
                                                            <RemoveActionButton
                                                                id={fieldsCount}
                                                                onRemove={() => {
                                                                    const lastField = currentSection.fields[fieldsCount - 1];
                                                                    handleDeleteField(currentSection.id, lastField.id);
                                                                }}
                                                                className='h-6 w-6'
                                                            />
                                                        )}
                                                        {fieldsCount < allFieldOptions.length && (
                                                            <AddActionButton
                                                                onAdd={() => handleAddField(currentSection.id)}
                                                                className='h-6 w-6'
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    /* Show only Add button when no fields */
                                    <div className="flex">
                                        <AddActionButton
                                            onAdd={() => handleAddField(currentSection.id)}
                                            className='h-6 w-6'
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileTab;