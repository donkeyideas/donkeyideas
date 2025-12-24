'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ProjectsPage() {
  const { currentCompany } = useAppStore();
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [showViewCardModal, setShowViewCardModal] = useState(false);
  const [showEditColumnModal, setShowEditColumnModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedColumn, setSelectedColumn] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'card' | 'column' | null>(null);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (currentCompany) {
      loadBoard();
    }
  }, [currentCompany]);

  const loadBoard = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(`/companies/${currentCompany.id}/boards`);
      const boards = response.data.boards || [];
      // Use first board or create default
      if (boards.length > 0) {
        setBoard(boards[0]);
      } else {
        // Create default board
        const newBoard = await api.post(`/companies/${currentCompany.id}/boards`, {
          name: 'Main Board',
        });
        setBoard(newBoard.data.board);
      }
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async (columnName: string) => {
    if (!board || !columnName.trim()) return;

    try {
      const position = board.columns.length;
      await api.post(`/boards/${board.id}/columns`, {
        name: columnName,
        position,
      });
      loadBoard();
      setShowColumnModal(false);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Column created successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to create column',
        type: 'error',
      });
    }
  };

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddCard = async (title: string, description: string = '') => {
    if (!selectedColumnId || !title.trim()) return;

    try {
      const column = board.columns.find((c: any) => c.id === selectedColumnId);
      const position = column ? column.cards.length : 0;
      await api.post(`/columns/${selectedColumnId}/cards`, {
        title,
        description,
        position,
        tags: [],
      });
      loadBoard();
      setShowCardModal(false);
      setSelectedColumnId(null);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Card created successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to create card',
        type: 'error',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the card being dragged
    let activeCard: any = null;
    let activeColumnId: string | null = null;
    let activeColumnIndex = -1;
    let activeCardIndex = -1;
    
    for (let colIdx = 0; colIdx < board.columns.length; colIdx++) {
      const column = board.columns[colIdx];
      const cardIdx = column.cards.findIndex((c: any) => c.id === activeId);
      if (cardIdx !== -1) {
        activeCard = column.cards[cardIdx];
        activeColumnId = column.id;
        activeColumnIndex = colIdx;
        activeCardIndex = cardIdx;
        break;
      }
    }

    if (!activeCard || !activeColumnId) return;

    // Check if dropped on a column or another card
    const overColumn = board.columns.find((c: any) => c.id === overId);
    const overCard = board.columns
      .flatMap((c: any) => c.cards)
      .find((c: any) => c.id === overId);

    let targetColumnId: string;
    let newPosition: number;
    let targetColumnIndex = -1;

    if (overColumn) {
      // Dropped on a column
      targetColumnId = overColumn.id;
      targetColumnIndex = board.columns.findIndex((c: any) => c.id === overColumn.id);
      newPosition = overColumn.cards.length;
    } else if (overCard) {
      // Dropped on another card
      const overColumn = board.columns.find((c: any) =>
        c.cards.some((card: any) => card.id === overId)
      );
      if (!overColumn) return;
      targetColumnId = overColumn.id;
      targetColumnIndex = board.columns.findIndex((c: any) => c.id === overColumn.id);
      const overCardIndex = overColumn.cards.findIndex((c: any) => c.id === overId);
      newPosition = overCardIndex;
    } else {
      return;
    }

    // If moving to the same column and position, do nothing
    if (activeColumnId === targetColumnId) {
      if (activeCardIndex === newPosition) return;
    }

    // Optimistic update - update UI immediately
    const updatedBoard = { ...board };
    const updatedColumns = [...updatedBoard.columns];
    
    // Remove card from source column
    const sourceColumn = { ...updatedColumns[activeColumnIndex] };
    const sourceCards = [...sourceColumn.cards];
    sourceCards.splice(activeCardIndex, 1);
    sourceColumn.cards = sourceCards;
    updatedColumns[activeColumnIndex] = sourceColumn;
    
    // Add card to target column
    const targetColumn = { ...updatedColumns[targetColumnIndex] };
    const targetCards = [...targetColumn.cards];
    targetCards.splice(newPosition, 0, activeCard);
    targetColumn.cards = targetCards;
    updatedColumns[targetColumnIndex] = targetColumn;
    
    updatedBoard.columns = updatedColumns;
    setBoard(updatedBoard);

    // Update in background (non-blocking)
    api.put(`/cards/${activeId}/move`, {
      columnId: targetColumnId,
      position: newPosition,
    }).catch((error: any) => {
      // Revert on error
      loadBoard();
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to move card',
        type: 'error',
      });
    });
  };

  const handleViewCard = (card: any) => {
    setSelectedCard(card);
    setShowViewCardModal(true);
  };

  const handleEditCard = (card: any) => {
    setSelectedCard(card);
    setShowEditCardModal(true);
  };

  const handleDeleteCard = (card: any) => {
    setSelectedCard(card);
    setDeleteType('card');
    setShowDeleteConfirm(true);
  };

  const handleEditColumn = (column: any) => {
    setSelectedColumn(column);
    setShowEditColumnModal(true);
  };

  const handleDeleteColumn = (column: any) => {
    setSelectedColumn(column);
    setDeleteType('column');
    setShowDeleteConfirm(true);
  };

  const handleUpdateCard = async (title: string, description: string) => {
    if (!selectedCard || !title.trim()) return;

    try {
      await api.put(`/cards/${selectedCard.id}`, {
        title,
        description,
      });
      loadBoard();
      setShowEditCardModal(false);
      setSelectedCard(null);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Card updated successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to update card',
        type: 'error',
      });
    }
  };

  const handleUpdateColumn = async (name: string) => {
    if (!selectedColumn || !name.trim()) return;

    try {
      await api.put(`/columns/${selectedColumn.id}`, {
        name: name.trim(),
      });
      loadBoard();
      setShowEditColumnModal(false);
      setSelectedColumn(null);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Column updated successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to update column',
        type: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCard && !selectedColumn) return;

    try {
      if (deleteType === 'card' && selectedCard) {
        await api.delete(`/cards/${selectedCard.id}`);
        setNotification({
          isOpen: true,
          title: 'Success',
          message: 'Card deleted successfully',
          type: 'success',
        });
      } else if (deleteType === 'column' && selectedColumn) {
        await api.delete(`/columns/${selectedColumn.id}`);
        setNotification({
          isOpen: true,
          title: 'Success',
          message: 'Column deleted successfully',
          type: 'success',
        });
      }
      loadBoard();
      setShowDeleteConfirm(false);
      setSelectedCard(null);
      setSelectedColumn(null);
      setDeleteType(null);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to delete',
        type: 'error',
      });
    }
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon="🏢"
        title="No company selected"
        description="Select a company from the sidebar to view project board"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60">Loading...</div>;
  }

  if (!board) {
    return <div className="text-white/60">Loading board...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Project Board</h1>
          <p className="text-white/60">{currentCompany.name} — Kanban-style task management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowColumnModal(true)}>
            + Add Column
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + New Card
          </Button>
        </div>
      </div>

      {board.columns.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No columns yet"
          description="Create columns to organize your tasks"
          action={
            <Button variant="primary" onClick={() => setShowColumnModal(true)}>
              Create Column
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveId(event.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4">
            {board.columns.map((column: any) => (
              <DroppableColumn
                key={column.id}
                column={column}
                onEdit={() => handleEditColumn(column)}
                onDelete={() => handleDeleteColumn(column)}
                onAddCard={() => {
                  setSelectedColumnId(column.id);
                  setShowCardModal(true);
                }}
                onViewCard={handleViewCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <Card className="cursor-grabbing opacity-90 rotate-2">
                <CardContent className="p-4">
                  <div className="font-semibold mb-2">
                    {board.columns
                      .flatMap((c: any) => c.cards)
                      .find((c: any) => c.id === activeId)?.title}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showColumnModal && (
        <ColumnModal
          onClose={() => setShowColumnModal(false)}
          onSubmit={handleAddColumn}
        />
      )}

      {showCardModal && (
        <CardModal
          onClose={() => {
            setShowCardModal(false);
            setSelectedColumnId(null);
          }}
          onSubmit={(title, description) => handleAddCard(title, description)}
        />
      )}

      {showViewCardModal && selectedCard && (
        <ViewCardModal
          card={selectedCard}
          onClose={() => {
            setShowViewCardModal(false);
            setSelectedCard(null);
          }}
          onEdit={() => {
            setShowViewCardModal(false);
            setShowEditCardModal(true);
          }}
        />
      )}

      {showEditCardModal && selectedCard && (
        <CardModal
          title="Edit Card"
          initialTitle={selectedCard.title}
          initialDescription={selectedCard.description || ''}
          onClose={() => {
            setShowEditCardModal(false);
            setSelectedCard(null);
          }}
          onSubmit={(title, description) => handleUpdateCard(title, description)}
        />
      )}

      {showEditColumnModal && selectedColumn && (
        <ColumnModal
          title="Edit Column"
          initialName={selectedColumn.name}
          onClose={() => {
            setShowEditColumnModal(false);
            setSelectedColumn(null);
          }}
          onSubmit={handleUpdateColumn}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          type={deleteType || 'card'}
          name={deleteType === 'card' ? selectedCard?.title : selectedColumn?.name}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedCard(null);
            setSelectedColumn(null);
            setDeleteType(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

function DeleteConfirmModal({
  type,
  name,
  onClose,
  onConfirm,
}: {
  type: 'card' | 'column';
  name?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Delete {type === 'card' ? 'Card' : 'Column'}?</h2>
        <p className="text-white/60 mb-6">
          Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} className="bg-red-500 hover:bg-red-600">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function ColumnModal({
  title = 'Create Column',
  initialName = '',
  onClose,
  onSubmit,
}: {
  title?: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Column Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., To Do, In Progress"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {title.includes('Edit') ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  onEdit,
  onDelete,
  onAddCard,
  onViewCard,
  onEditCard,
  onDeleteCard,
}: {
  column: any;
  onEdit: () => void;
  onDelete: () => void;
  onAddCard: () => void;
  onViewCard: (card: any) => void;
  onEditCard: (card: any) => void;
  onDeleteCard: (card: any) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="min-w-[320px] bg-white/3 border border-white/10 rounded-lg p-4"
    >
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-semibold text-sm uppercase">{column.name}</span>
          <span className="bg-white/10 px-2 py-1 rounded text-xs">
            {column.cards.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Edit column"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-white/60 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
            title="Delete column"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <SortableContext
        items={column.cards.map((c: any) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[200px]">
          {column.cards.map((card: any) => (
            <SortableCard
              key={card.id}
              card={card}
              onView={() => onViewCard(card)}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card)}
            />
          ))}
        </div>
      </SortableContext>
      <button
        onClick={onAddCard}
        className="w-full mt-3 p-3 bg-white/5 border border-dashed border-white/20 rounded text-white/60 hover:border-blue-500 hover:text-white transition-colors"
      >
        + Add Card
      </button>
    </div>
  );
}

function SortableCard({ card, onView, onEdit, onDelete }: { card: any; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="hover:border-blue-500 group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div
              {...attributes}
              {...listeners}
              className="flex-1 cursor-grab active:cursor-grabbing"
            >
              <div className="font-semibold">{card.title}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="p-1 text-white/60 hover:text-blue-400 hover:bg-white/5 rounded transition-colors"
                title="View card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors"
                title="Edit card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 text-white/60 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
                title="Delete card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          {card.tags && card.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {card.tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ViewCardModal({
  card,
  onClose,
  onEdit,
}: {
  card: any;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">View Card</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/60">Card Title</label>
            <div className="text-xl font-semibold">{card.title}</div>
          </div>
          
          {card.description && (
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">Description</label>
              <div className="bg-white/5 border border-white/10 rounded-md p-4 text-white whitespace-pre-wrap font-mono text-sm">
                {card.description}
              </div>
            </div>
          )}
          
          {card.tags && card.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-white/60">Tags</label>
              <div className="flex gap-2 flex-wrap">
                {card.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={onEdit}>
            Edit Card
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardModal({
  title: modalTitle = 'Create Card',
  initialTitle = '',
  initialDescription = '',
  onClose,
  onSubmit,
}: {
  title?: string;
  initialTitle?: string;
  initialDescription?: string;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6">{modalTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Card Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 text-lg"
              placeholder="Enter card title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
              placeholder="Enter card description"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
