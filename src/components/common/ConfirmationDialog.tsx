import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../ui/tailwind/Button';

/**
 * ConfirmationDialog Component
 *
 * An animated confirmation dialog with customizable icon, title, message, and actions.
 * Features smooth scale and fade animations for open/close transitions.
 *
 * @component
 *
 * @example
 * // Basic usage (delete confirmation)
 * <ConfirmationDialog
 *   open={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 * />
 *
 * @example
 * // With danger icon
 * <ConfirmationDialog
 *   open={showConfirm}
 *   onClose={handleClose}
 *   onConfirm={handleConfirm}
 *   title="Warning"
 *   message="This action cannot be undone."
 *   icon="danger"
 * />
 *
 * @example
 * // With info icon and custom button text
 * <ConfirmationDialog
 *   open={showInfo}
 *   onClose={handleClose}
 *   onConfirm={handleSubmit}
 *   title="Submit Form"
 *   message="Ready to submit your changes?"
 *   icon="info"
 *   confirmText="Submit"
 *   cancelText="Go Back"
 * />
 *
 * @example
 * // With custom confirm button styling
 * <ConfirmationDialog
 *   open={showSave}
 *   onClose={handleClose}
 *   onConfirm={handleSave}
 *   title="Save Changes"
 *   message="Save your progress?"
 *   confirmButtonClass="bg-green-500 hover:bg-green-600 text-white"
 * />
 *
 * Props:
 * ------
 * @param {boolean} open - Whether dialog is visible (required)
 * @param {() => void} onClose - Callback when dialog closes (required)
 * @param {() => void} onConfirm - Callback when confirm button clicked (required)
 * @param {string} [title="Confirm Action"] - Dialog title
 * @param {string} [message="Are you sure you want to proceed?"] - Dialog message
 * @param {string} [confirmText="Confirm"] - Confirm button text
 * @param {string} [cancelText="Cancel"] - Cancel button text
 * @param {string} [confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"] - Confirm button classes
 * @param {"warning" | "danger" | "info"} [icon="warning"] - Icon type to display
 * @param {boolean} [loading=false] - Show loading spinner on confirm button
 *
 * Icon Types:
 * -----------
 * - "warning": Orange/amber gradient with warning triangle
 * - "danger": Red gradient with exclamation circle
 * - "info": Blue gradient with info circle
 *
 * Features:
 * ---------
 * - Smooth scale animation (0 → 100%) on open/close
 * - Backdrop with blur effect
 * - Escape key closes dialog
 * - Click outside closes dialog
 * - z-index: 9999 (backdrop), 10000 (dialog)
 * - Sticky header and footer
 * - Icon animation with 100ms delay
 * - 300ms transition duration
 */
interface ConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    icon?: 'warning' | 'danger' | 'info';
    loading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonClass = 'bg-red-500 hover:bg-red-600 text-white',
    icon = 'warning',
    loading = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
    const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                handleClose();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    // Handle open/close animations with proper timing
    useEffect(() => {
        // Clear any pending timers/frames
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        if (open) {
            // Opening sequence - reset animation state first
            setIsAnimating(false);
            setIsVisible(true);
            // Use requestAnimationFrame for smoother animation start
            animationFrameRef.current = requestAnimationFrame(() => {
                animationFrameRef.current = requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        } else if (isVisible) {
            // Closing sequence
            setIsAnimating(false);
            closeTimerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 300); // Match the CSS transition duration
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
            }
        };
    }, [open]);

    const handleClose = () => {
        onClose();
    };

    const handleConfirm = () => {
        onConfirm();
    };

    if (!isVisible) return null;

    const getIcon = () => {
        switch (icon) {
            case 'warning':
                return (
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" 
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                );
            case 'danger':
                return (
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F64E60]/10">
                            <svg className="w-5 h-5 text-[#F64E60]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                    </div>
                );
            case 'info':
                return (
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3699FF]/10">
                            <svg className="w-5 h-5 text-[#3699FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            {/* Backdrop with smooth animation - no click to close */}
            <div
                className={`
                    fixed inset-0 z-[9999]
                    bg-black/40 backdrop-blur-md
                    transition-opacity duration-300 ease-out
                    ${isAnimating ? 'opacity-100' : 'opacity-0'}
                `}
                style={{
                    transitionProperty: 'opacity',
                }}
            />
            
            {/* Dialog with shrinking animation */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                <div 
                    className={`
                        bg-white w-full max-w-md pointer-events-auto
                        shadow-2xl rounded-lg overflow-hidden
                        transition-all duration-300 ease-out
                        ${isAnimating 
                            ? 'scale-100 opacity-100' 
                            : 'scale-0 opacity-0'
                        }
                    `}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        transitionProperty: 'transform, opacity',
                        transformOrigin: 'center center',
                    }}
                >

                        {/* Header with icon */}
                        <div className="sticky top-0 z-10 px-6 py-3 border-b bg-white">
                            <div className="flex items-center space-x-3">
                                <div 
                                    className={`
                                        transform transition-all duration-500 ease-out
                                        ${isAnimating ? 'scale-100' : 'scale-0'}
                                    `}
                                    style={{
                                        transitionProperty: 'transform',
                                        transitionDelay: isAnimating ? '100ms' : '0ms',
                                    }}
                                >
                                    {getIcon()}
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {title}
                                </h2>
                            </div>
                        </div>

                        {/* Body - Modal style */}
                        <div className="relative flex-1 overflow-y-auto px-6 py-6">
                            <p className="text-gray-700 text-base leading-relaxed">
                                {message}
                            </p>
                        </div>
                            
                        {/* Action buttons */}
                        <div className="sticky bottom-0 z-10 px-6 py-4 border-t bg-white flex justify-end">
                            <Button
                                className={`mr-4 bg-[#E4E6EF] hover:bg-gray-300 w-[100px] text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label={cancelText}
                                onClick={handleClose}
                                disabled={loading}
                            >{cancelText}
                            </Button>

                            <Button
                                className={`${confirmButtonClass} bg-[#3699FF] w-[100px] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md cursor-pointer ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                                aria-label={confirmText}
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="inline-block h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    confirmText
                                )}
                            </Button>
                        </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationDialog;


