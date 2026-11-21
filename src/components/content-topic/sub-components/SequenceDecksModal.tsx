import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { useSnackbar } from 'notistack';
import TwinModal from '@/components/common/TwinModal';
import { Button } from '@/components/ui/tailwind';
import Spinner from '@/components/common/Spinner';
import { fetchContentDecks, saveDeckSequence } from '@/lib/api/contentDeckApi';
import { getProjectId } from '@/lib/storage/sharedStorage';

interface DeckItem {
  id: number;
  code: string;
  name: string;
  cards: number;
  status: number; // 1 = Active, 0 = Inactive
  displayOrder: number;
}

interface SequenceDecksModalProps {
  open: boolean;
  onClose: () => void;
  topicId: number | null;
  topicName: string;
}

const DeckRow = memo<{
  deck: DeckItem;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
}>(({ deck, provided, snapshot }) => (
  <div
    ref={provided.innerRef}
    {...provided.draggableProps}
    {...provided.dragHandleProps}
    className={`flex items-center gap-3 px-4 py-3 rounded border bg-white cursor-grab active:cursor-grabbing select-none ${
      snapshot.isDragging
        ? 'border-[#3699FF] shadow-lg'
        : 'border-[#E4E6EF] hover:border-[#B5B5C3]'
    }`}
    style={provided.draggableProps.style}
  >
    <div className="cursor-grab active:cursor-grabbing text-[#3699FF] hover:text-blue-700 flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </div>

    <span className="flex-1 text-[13px] font-medium truncate text-[#3F4254]">
      {deck.code} - {deck.name}
    </span>

    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F3F6F9] flex items-center justify-center text-[11px] font-semibold text-[#7E8299]">
      {deck.cards}
    </span>

    <span className={`flex-shrink-0 w-[70px] text-center rounded-full text-xs font-medium px-2.5 py-1 ${
      deck.status === 1 ? 'active-status' : 'inactive-status'
    }`}>
      {deck.status === 1 ? 'Active' : 'Inactive'}
    </span>
  </div>
));

DeckRow.displayName = 'DeckRow';

// Portal wrapper for dragged items to avoid modal transform offset issues
const PortalAwareDeckRow = memo<{
  deck: DeckItem;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
}>(({ deck, provided, snapshot }) => {
  const row = <DeckRow deck={deck} provided={provided} snapshot={snapshot} />;
  return snapshot.isDragging ? ReactDOM.createPortal(row, document.body) : row;
});

PortalAwareDeckRow.displayName = 'PortalAwareDeckRow';

// Sort decks: sequenceDisplayOrder first, then nulls sorted by id
function sortAndAssignOrder(rawDecks: any[], topicId: number): DeckItem[] {
  const mapped = rawDecks
    .filter((d: any) => d.contentTopicId === topicId)
    .map((d: any) => ({
      id: d.deckId,
      code: d.deckCode || '',
      name: d.deckName,
      cards: d.cards || 0,
      status: d.status,
      displayOrder: d.sequenceDisplayOrder as number | null,
    }));

  const withOrder = mapped
    .filter(d => d.displayOrder != null)
    .sort((a, b) => a.displayOrder! - b.displayOrder!);
  const withoutOrder = mapped
    .filter(d => d.displayOrder == null)
    .sort((a, b) => a.id - b.id);

  return [...withOrder, ...withoutOrder].map((d, index) => ({
    ...d,
    displayOrder: index + 1,
  }));
}

const SequenceDecksModal: React.FC<SequenceDecksModalProps> = memo(({
  open,
  onClose,
  topicId,
  topicName,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !topicId) return;

    const projectId = getProjectId() || 0;
    let cancelled = false;

    setIsLoading(true);
    fetchContentDecks(projectId)
      .then((allDecks: any[]) => {
        if (!cancelled) setDecks(sortAndAssignOrder(allDecks, topicId));
      })
      .catch(() => { if (!cancelled) setDecks([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [open, topicId]);

  useEffect(() => {
    if (!open) setDecks([]);
  }, [open]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    setDecks(prev => {
      const items = Array.from(prev);
      const [reordered] = items.splice(result.source.index, 1);
      items.splice(result.destination!.index, 0, reordered);
      return items.map((item, index) => ({ ...item, displayOrder: index + 1 }));
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const projectId = getProjectId() || 0;
      await saveDeckSequence({
        projectId,
        topicId: topicId!,
        sequenceList: decks.map(d => ({ deckId: d.id, sequenceOrder: d.displayOrder })),
      });
      enqueueSnackbar('Deck sequence updated successfully', { variant: 'success' });
      onClose();
    } catch {
      enqueueSnackbar('Failed to update deck sequence. Please try again.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [decks, topicId, onClose, enqueueSnackbar]);

  const header = useMemo(() => (
    <h2 className="text-base font-semibold text-[#3F4254]">
      Deck Sequence — {topicName}
    </h2>
  ), [topicName]);

  const footer = useMemo(() => (
    <>
      <Button
        className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Cancel"
        type="button"
        onClick={onClose}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
        aria-label="Save"
        type="button"
        onClick={handleSave}
        disabled={isSaving || decks.length === 0}
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        ) : (
          'Save'
        )}
      </Button>
    </>
  ), [isSaving, decks.length, onClose, handleSave]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      );
    }

    if (decks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-[#B5B5C3]">
          <span className="text-sm">No decks assigned to this topic</span>
        </div>
      );
    }

    return (
      <div className="py-1">
        <p className="text-xs text-[#B5B5C3] mb-4">
          Drag to reorder the deck sequence
        </p>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="deck-sequence">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2.5"
              >
                {decks.map((deck, index) => (
                  <Draggable key={deck.id} draggableId={String(deck.id)} index={index}>
                    {(draggableProvided, draggableSnapshot) => (
                      <PortalAwareDeckRow
                        deck={deck}
                        provided={draggableProvided}
                        snapshot={draggableSnapshot}
                      />
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
  }, [isLoading, decks, handleDragEnd]);

  return (
    <TwinModal
      open={open}
      onClose={onClose}
      header={header}
      footer={footer}
      modalClassName="max-w-[800px]"
      mainHeightClassName="h-auto top-0 max-h-[70vh]"
      allowBorder
      closeOnOutsideClick={false}
    >
      <div className="bg-white">{content}</div>
    </TwinModal>
  );
});

SequenceDecksModal.displayName = 'SequenceDecksModal';

export default SequenceDecksModal;
