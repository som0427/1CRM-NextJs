import React from "react";

interface SequenceActionButtonProps {
  id: number;
  topicName: string;
  onSequence?: (id: number, topicName: string) => void;
  disabled?: boolean;
  className?: string;
}

const SequenceActionButton: React.FC<SequenceActionButtonProps> = ({
  id,
  topicName,
  onSequence,
  disabled = false,
  className,
}) => (
  <button
    title={disabled ? "Sequence (disabled)" : "Sequence Decks"}
    onClick={() => !disabled && onSequence && onSequence(id, topicName)}
    type="button"
    disabled={disabled}
    className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    } ${className || ""}`}
  >
    <img
      src={disabled ? "/svg/icons/general/sequence-disable.svg" : "/svg/icons/general/sequence.svg"}
      alt={disabled ? "Sequence Disabled" : "Sequence Decks"}
      className="h-6 w-6"
    />
  </button>
);

export default SequenceActionButton;
