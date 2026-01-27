"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Plus, Trash2, Loader2 } from "lucide-react";

interface EditableSectionProps {
  value?: string;
  items?: string[];
  type: "text" | "list";
  onSave: (value: string | string[]) => Promise<void>;
  disabled?: boolean;
}

export function EditableSection({
  value,
  items,
  type,
  onSave,
  disabled = false,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Text editing state
  const [editedText, setEditedText] = useState(value || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // List editing state
  const [editedItems, setEditedItems] = useState<string[]>(items || []);
  const [newItem, setNewItem] = useState("");

  // Reset state when props change
  useEffect(() => {
    setEditedText(value || "");
  }, [value]);

  useEffect(() => {
    setEditedItems(items || []);
  }, [items]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedText, isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedText(value || "");
    setEditedItems(items || []);
    setNewItem("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (type === "text") {
        await onSave(editedText);
      } else {
        await onSave(editedItems.filter((item) => item.trim() !== ""));
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      setEditedItems([...editedItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, newValue: string) => {
    const updated = [...editedItems];
    updated[index] = newValue;
    setEditedItems(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && type === "list") {
      e.preventDefault();
      handleAddItem();
    }
  };

  // View mode for text
  if (type === "text" && !isEditing) {
    return (
      <div className="relative group">
        <div className="flex items-start gap-2">
          <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap flex-1">
            {value || "No content available"}
          </p>
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 px-2 text-neutral-500 hover:text-neutral-700 border-neutral-200"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    );
  }

  // View mode for list
  if (type === "list" && !isEditing) {
    return (
      <div className="relative group">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {items && items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-inherit"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 shrink-0 opacity-50" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500 text-sm italic">No items</p>
            )}
          </div>
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 px-2 text-neutral-500 hover:text-neutral-700 border-neutral-200"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Edit mode for text
  if (type === "text" && isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          ref={textareaRef}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full min-h-[100px] p-3 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none text-neutral-700"
          disabled={isSaving}
        />
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode for list
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {editedItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => handleUpdateItem(i, e.target.value)}
              className="flex-1 p-2 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm text-neutral-700"
              disabled={isSaving}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive-500 hover:text-destructive-700 hover:bg-destructive-50"
              onClick={() => handleRemoveItem(i)}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add new item..."
          className="flex-1 p-2 rounded-lg border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm text-neutral-700"
          disabled={isSaving}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleAddItem}
          disabled={isSaving || !newItem.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 justify-end pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
