import React from 'react';

// Modal styles - similar to ProjectSelectionModal
const modalStyles = {
  overlay: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '4px',
    maxWidth: '500px',
    width: '100%',
    padding: 0,
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    padding: '1rem',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalBody: {
    padding: '1rem'
  },
  modalFooter: {
    padding: '1rem',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  button: {
    cursor: 'pointer',
    padding: '0.375rem 0.75rem',
    fontSize: '1rem',
    lineHeight: 1.5,
    borderRadius: '0.25rem',
    marginLeft: '0.5rem'
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: '1px solid #6c757d'
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: '1px solid #007bff'
  }
};

interface ConfirmLoginModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmLoginModal: React.FC<ConfirmLoginModalProps> = ({
  onConfirm,
  onCancel
}) => {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.modalHeader}>
          <h4>Confirm Login</h4>
        </div>
        <div style={modalStyles.modalBody}>
          <p>This account is already logged in on another device or browser. Would you like to continue and log out from other sessions?</p>
        </div>
        <div style={modalStyles.modalFooter}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...modalStyles.button,
              ...modalStyles.secondaryButton
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...modalStyles.button,
              ...modalStyles.primaryButton
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLoginModal;
