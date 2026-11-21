import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Priority queue for action items in grid cells
 * Empty placeholders are prioritized first, then visible buttons in insertion order
 *
 * Features:
 * - Auto re-renders if DOM is manipulated via DevTools
 * - Frozen array output to prevent runtime manipulation
 *
 * Usage:
 * const queue = createActionQueue();
 * queue.add(<EditButton />, true);  // visible button
 * queue.add(<DeleteButton />, false);  // empty placeholder
 * queue.getActions();  // returns [placeholder, EditButton] - empties first
 *
 * For DOM manipulation protection, wrap your container with useActionCellProtection hook
 */

type ActionItem = { isEmpty: boolean; node: React.ReactNode; order: number };

export const createActionQueue = () => {
  const items: ActionItem[] = [];
  let orderCounter = 0;

  return {
    /**
     * Add an action item to the queue
     * @param node - React node to render (button or placeholder div)
     * @param isVisible - true if visible button, false if empty placeholder
     */
    add: (node: React.ReactNode, isVisible: boolean = true) => {
      items.push({ isEmpty: !isVisible, node, order: orderCounter++ });
    },

    /**
     * Get sorted actions - empty placeholders first, then visible buttons
     * Returns a frozen array to prevent runtime manipulation
     */
    getActions: (): React.ReactNode[] => {
      const sortedActions = items
        .sort((a, b) => {
          if (a.isEmpty !== b.isEmpty) {
            return a.isEmpty ? -1 : 1; // Empty items come first
          }
          return a.order - b.order; // Maintain insertion order within same type
        })
        .map(item => item.node);

      // Freeze the array to prevent runtime manipulation
      return Object.freeze(sortedActions) as React.ReactNode[];
    }
  };
};

/**
 * Creates an empty placeholder div with consistent sizing
 */
export const createPlaceholder = (key: string, className: string = "w-6 h-6") => {
  return React.createElement("div", { key, className });
};

/**
 * Hook to protect action cells from DOM manipulation via DevTools
 * Watches for attribute/class changes and triggers re-render
 *
 * Usage:
 * const { containerRef, renderKey } = useActionCellProtection();
 * return <div ref={containerRef} key={renderKey}>{queue.getActions()}</div>
 */
export const useActionCellProtection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderKey, setRenderKey] = useState(0);

  const forceRerender = useCallback(() => {
    setRenderKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // MutationObserver to detect DOM manipulation
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check for attribute changes (disabled, class, style, etc.)
        if (mutation.type === "attributes") {
          const target = mutation.target as HTMLElement;
          const attrName = mutation.attributeName;

          // Detect manipulation of disabled, class, or style attributes
          if (
            attrName === "disabled" ||
            attrName === "class" ||
            attrName === "style"
          ) {
            // Force re-render to restore original state
            forceRerender();
            return;
          }
        }

        // Check for child list changes (element removal/addition)
        if (mutation.type === "childList") {
          forceRerender();
          return;
        }
      }
    });

    // Observe the container and all descendants
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["disabled", "class", "style"],
    });

    return () => observer.disconnect();
  }, [forceRerender, renderKey]);

  return { containerRef, renderKey };
};
