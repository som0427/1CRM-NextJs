import React, { useEffect } from 'react';

export interface ToastProps {
    show: boolean;
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
    duration?: number; // Auto-hide duration in ms, default 5000
    position?: 'top' | 'bottom'; // Position of toast, default 'bottom'
    className?: string; // Custom classes for styling
}

const Toast: React.FC<ToastProps> = ({
    show,
    message,
    type,
    onClose,
    duration = 5000,
    position = 'bottom',
    className = ''
}) => {
    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const positionClass = position === 'top' ? 'top-40' : 'bottom-6';

    return (
        <div
            className={`fixed ${positionClass} left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-300 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} ${className}`}
            style={{ minWidth: '300px', maxWidth: '500px' }}
        >
            <div className="flex items-center justify-between">
                <span>{message}</span>
                <button
                    onClick={onClose}
                    className="ml-4 text-white hover:text-gray-200 focus:outline-none"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Toast;

// Custom hook for toast state management
export const useToast = () => {
    const [toast, setToast] = React.useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error';
    }>({ show: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, show: false }));
    };

    return { toast, showToast, hideToast };
};
