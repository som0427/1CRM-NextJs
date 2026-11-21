import React, { useState, useEffect, useMemo } from 'react';
import { MenuData, TreeNode, MenuType } from '../../../lib/models/menu.model';
import { Select } from '../../ui/tailwind/Select';

interface CRMPermissionValue {
  upload?: ("Bulk Add" | "Bulk Edit" | "Bulk Upload")[];
  all?: ("Add" | "Edit" | "View")[];
  team?: ("Add" | "Edit" | "View")[];
  self?: ("Add" | "Edit" | "View")[];
}

type CRMPermissionsMap = Record<number, CRMPermissionValue>;

interface MenuTreeViewProps {
  menuData: MenuData[];
  selectedMenuIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  loading?: boolean;
  // Optional: control which node IDs should show CRM permission selects
  crmPermissionNodeIds?: number[]; // defaults to [608, 610, 611]
  // Optional: control which node IDs should show only Upload select (Admin -> Users/Products)
  uploadOnlyNodeIds?: number[]; // defaults to [614, 623]
  // Optional: control which node IDs should show only All/Team/Self (no Upload) - e.g., Mobile App tab
  atsPermissionNodeIds?: number[]; // defaults to []
  // Optional: selection limits for children under a parent
  selectionLimits?: { parentId: number; max: number }[]; // e.g., [{ parentId: 5, max: 5 }]
  // Pass initial values and receive updates for permission selections
  initialCRMPermissions?: CRMPermissionsMap;
  onCRMPermissionsChange?: (perms: CRMPermissionsMap) => void;
}

const MenuTreeView: React.FC<MenuTreeViewProps> = ({
  menuData,
  selectedMenuIds,
  onSelectionChange,
  loading = false,
  crmPermissionNodeIds = [608, 610, 611],
  uploadOnlyNodeIds = [614, 623],
  atsPermissionNodeIds = [],
  selectionLimits = [],
  initialCRMPermissions = {},
  onCRMPermissionsChange,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [crmPerms, setCrmPerms] = useState<CRMPermissionsMap>(initialCRMPermissions || {});

  // Sync external initial values on change
  useEffect(() => {
    setCrmPerms(initialCRMPermissions || {});
  }, [initialCRMPermissions]);

  // Transform flat menu data into tree structure based on parentMenuId and hasChild
  const treeData = useMemo(() => {
    // Normalize selected ids to numbers to avoid string/number mismatch across APIs
    const selectedIdsSet = new Set((selectedMenuIds || []).map(id => Number(id)));
    console.log('MenuTreeView received menuData:', menuData);
    console.log('MenuTreeView menuData length:', menuData?.length || 0);
    
    if (!menuData || !Array.isArray(menuData) || menuData.length === 0) {
      console.log('MenuTreeView: No valid menu data');
      return [];
    }

    const buildTree = (items: MenuData[], parentId: number = 0, level: number = 0): TreeNode[] => {
      // Filter items that belong to this parent level
      const filtered = items.filter(item => item.parentMenuId === parentId);
      
      console.log(`Building tree for parentId ${parentId}, found ${filtered.length} items at level ${level}:`, 
        filtered.map(f => `${f.menuName} (id: ${f.menuId}, parent: ${f.parentMenuId})`));
      
      // Preserve API response order (do not sort alphabetically)
      return filtered
        .map(item => {
          const children = item.hasChild === 1 ? buildTree(items, item.menuId, level + 1) : [];
          return {
            ...item,
            isSelected: selectedIdsSet.has(Number(item.menuId)),
            isExpanded: expandedNodes.has(item.menuId),
            level,
            children,
            isPartiallySelected: children.length > 0 && 
              children.some(child => child.isSelected || child.isPartiallySelected) &&
              !children.every(child => child.isSelected)
          };
        });
    };

    const result = buildTree(menuData);
    console.log('MenuTreeView built tree - root items:', result.map(r => r.menuName));
    console.log('MenuTreeView full tree structure:', result);
    return result;
  }, [menuData, selectedMenuIds, expandedNodes]);

  // Handle node expansion/collapse
  const toggleExpansion = (menuId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  // Handle checkbox selection with parent-child logic
  const handleSelection = (node: TreeNode, isSelected: boolean) => {
    console.log('Checkbox clicked:', node.menuName, 'isSelected:', isSelected);
    
    const getAllChildIds = (node: TreeNode): number[] => {
      const ids = [node.menuId];
      node.children.forEach(child => {
        ids.push(...getAllChildIds(child));
      });
      return ids;
    };

    const getAllParentIds = (nodeId: number, nodes: TreeNode[]): number[] => {
      const result: number[] = [];

      const dfs = (currentNodes: TreeNode[]): boolean => {
        for (const n of currentNodes) {
          if (n.menuId === nodeId) {
            return true;
          }
          if (n.children && n.children.length > 0) {
            const foundInChild = dfs(n.children);
            if (foundInChild) {
              result.push(n.menuId);
              return true;
            }
          }
        }
        return false;
      };

      dfs(nodes);
      return result;
    };

    const newSelectedIds = new Set(selectedMenuIds);
    console.log('Current selected IDs:', Array.from(newSelectedIds));
    
    if (isSelected) {
      // Enforce selection limits if applicable
      // Determine if this node is within a limited parent
      const getAllParentIds = (nodeId: number, nodes: TreeNode[]): number[] => {
        const result: number[] = [];
        const dfs = (currentNodes: TreeNode[], parents: number[] = []) => {
          for (const n of currentNodes) {
            const newParents = [...parents, n.menuId];
            if (n.menuId === nodeId) {
              result.push(...parents);
              return true;
            }
            if (n.children && n.children.length > 0) {
              if (dfs(n.children, newParents)) return true;
            }
          }
          return false;
        };
        dfs(nodes, []);
        return result;
      };

      const parentChain = getAllParentIds(node.menuId, treeData);
      const limited = selectionLimits.find(l => l.parentId === node.menuId || parentChain.includes(l.parentId));
      if (limited) {
        // If clicking the limited parent directly, auto-select only the first <max> immediate children
        if (node.menuId === limited.parentId) {
          const findNodeById = (id: number, nodes: TreeNode[]): TreeNode | null => {
            for (const n of nodes) {
              if (n.menuId === id) return n;
              const c = findNodeById(id, n.children || []);
              if (c) return c;
            }
            return null;
          };
          const limitedParentNode = findNodeById(limited.parentId, treeData);
          const immediateChildIds: number[] = (limitedParentNode?.children || []).map(ch => ch.menuId);
          // Clear all existing descendant selections under this parent first
          const allDescendantIds: number[] = [];
          const collectAllDesc = (n: TreeNode | null) => {
            if (!n) return;
            n.children.forEach(ch => {
              allDescendantIds.push(ch.menuId);
              collectAllDesc(ch);
            });
          };
          collectAllDesc(limitedParentNode);
          allDescendantIds.forEach(id => newSelectedIds.delete(id));
          const toSelect = immediateChildIds.slice(0, limited.max);
          toSelect.forEach(id => newSelectedIds.add(id));
          // Optionally check the parent as well and expand it
          newSelectedIds.add(node.menuId);
          setExpandedNodes(prev => new Set([...Array.from(prev), node.menuId]));

          const finalSelectedIds = Array.from(newSelectedIds);
          onSelectionChange(finalSelectedIds);
          return;
        }
        // Count currently selected immediate children under limited parent
        const findNodeById = (id: number, nodes: TreeNode[]): TreeNode | null => {
          for (const n of nodes) {
            if (n.menuId === id) return n;
            const c = findNodeById(id, n.children || []);
            if (c) return c;
          }
          return null;
        };
        const limitedParentNode = findNodeById(limited.parentId, treeData);
        const immediateChildIds: number[] = (limitedParentNode?.children || []).map(ch => ch.menuId);
        const selectedCount = immediateChildIds.filter(id => newSelectedIds.has(id)).length;
        // If the current node is an immediate child, add 1 to the count tentatively; if not, find its top-level child under the parent
        const currentTopLevelChildId = (() => {
          if (immediateChildIds.includes(node.menuId)) return node.menuId;
          // find ancestor among immediate children
          const ancestors = getAllParentIds(node.menuId, treeData);
          const top = ancestors.reverse().find(a => immediateChildIds.includes(a));
          return top ?? node.menuId;
        })();
        const wouldBeSelectedNewChild = !newSelectedIds.has(currentTopLevelChildId);
        const projectedCount = selectedCount + (wouldBeSelectedNewChild ? 1 : 0);
        if (projectedCount > limited.max) {
          console.warn(`Selection blocked: max ${limited.max} children already selected under parent ${limited.parentId}`);
          return;
        }
      }

      // Select the node and all its children
      const affectedIds = getAllChildIds(node);
      console.log('Selecting IDs:', affectedIds);
      affectedIds.forEach(id => newSelectedIds.add(id));

      // Auto-select 'View' for Self dropdown on CRM-specific or ATS-only nodes
      const selfViewSet = new Set([
        ...crmPermissionNodeIds.map(n => Number(n)),
        ...atsPermissionNodeIds.map(n => Number(n)),
      ]);
      const crmTargets = affectedIds.filter(id => selfViewSet.has(Number(id)));
      if (crmTargets.length > 0) {
        setCrmPerms(prev => {
          const next: CRMPermissionsMap = { ...prev };
          crmTargets.forEach(id => {
            const curr = next[id] || {};
            const currentSelf = Array.isArray(curr.self) ? curr.self : [];
            if (!currentSelf.includes('View')) {
              curr.self = [...currentSelf, 'View'];
            }
            next[id] = curr;
          });
          onCRMPermissionsChange && onCRMPermissionsChange(next);
          return next;
        });
      }
      
      // Check if we need to select parent nodes
      const selectParentsIfComplete = (nodes: TreeNode[]) => {
        nodes.forEach(parentNode => {
          if (parentNode.children && parentNode.children.length > 0) {
            const allChildrenSelected = parentNode.children.every(child => newSelectedIds.has(child.menuId));
            if (allChildrenSelected) {
              newSelectedIds.add(parentNode.menuId);
            }
            selectParentsIfComplete(parentNode.children);
          }
        });
      };
      selectParentsIfComplete(treeData);

      // If a parent node with children is checked, expand it
      if (node.hasChild === 1 && node.children && node.children.length > 0) {
        setExpandedNodes(prev => {
          const ns = new Set(prev);
          ns.add(node.menuId);
          return ns;
        });
      }
    } else {
      // Unselect the node and all its children
      const affectedIds = getAllChildIds(node);
      console.log('Unselecting IDs:', affectedIds);
      affectedIds.forEach(id => newSelectedIds.delete(id));

      // Also reset any CRM permission selections tied to these IDs
      setCrmPerms(prev => {
        const next: CRMPermissionsMap = { ...prev };
        affectedIds.forEach(id => {
          if (next[id]) {
            delete next[id];
          }
        });
        onCRMPermissionsChange && onCRMPermissionsChange(next);
        return next;
      });
      
      // Unselect parent nodes if they were selected
      const parentIds = getAllParentIds(node.menuId, treeData);
      console.log('Unselecting parent IDs:', parentIds);
      parentIds.forEach(parentId => {
        newSelectedIds.delete(parentId);
      });
    }

    const finalSelectedIds = Array.from(newSelectedIds);
    console.log('Final selected IDs:', finalSelectedIds);
    onSelectionChange(finalSelectedIds);
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode): React.JSX.Element => {
    const hasChildren = node.hasChild === 1 && node.children.length > 0;
    const indentStyle = { paddingLeft: `${node.level * 20}px` };
    const showCrmSelects = crmPermissionNodeIds.includes(Number(node.menuId));
    const showUploadOnly = uploadOnlyNodeIds.includes(Number(node.menuId));
    const showATSOnly = atsPermissionNodeIds.includes(Number(node.menuId));

    return (
      <React.Fragment key={node.menuId}>
        <div className="menu-tree-node">
          <div 
            className="flex items-center py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
            style={indentStyle}
          >
            {/* Expansion toggle */}
            <div className="w-5 h-5 flex items-center justify-center mr-2">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpansion(node.menuId)}
                  className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-gray-800"
                >
                  {node.isExpanded ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ) : (
                <div className="w-4 h-4"></div>
              )}
            </div>

            {/* Checkbox */}
            <div className="mr-3">
              <input
                type="checkbox"
                checked={node.isSelected || false}
                ref={input => {
                  if (input) {
                    input.indeterminate = node.isPartiallySelected || false;
                  }
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSelection(node, e.target.checked);
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
              />
            </div>

            {/* Menu name */}
            <div className="w-[220px] flex items-center shrink-0">
              <span className={`text-sm ${node.level === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                {node.menuName}
              </span>
            </div>

            {/* CRM-specific permission dropdowns */
            }
            {showCrmSelects && (
              <div className={`grid grid-cols-4 gap-3 w-[520px] self-center items-center -mt-1 -ml-4 ${node.isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                {/* Upload */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">Upload</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Bulk Add', label: 'Bulk Add' },
                      { value: 'Bulk Edit', label: 'Bulk Edit' },
                      { value: 'Bulk Upload', label: 'Bulk Upload' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.upload || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], upload: (val as string[]) as CRMPermissionValue['upload'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>

                {/* All */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">All</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Add', label: 'Add' },
                      { value: 'Edit', label: 'Edit' },
                      { value: 'View', label: 'View' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.all || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], all: (val as string[]) as CRMPermissionValue['all'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>

                {/* Team */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">Team</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Add', label: 'Add' },
                      { value: 'Edit', label: 'Edit' },
                      { value: 'View', label: 'View' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.team || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], team: (val as string[]) as CRMPermissionValue['team'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>

                {/* Self */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">Self</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Add', label: 'Add' },
                      { value: 'Edit', label: 'Edit' },
                      { value: 'View', label: 'View' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.self || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], self: (val as string[]) as CRMPermissionValue['self'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>
              </div>
            )}
            {/* ATS-only (All, Team, Self) - for Mobile App tab */}
            {showATSOnly && (
              <div className={`grid grid-cols-3 gap-6 w-[400px] self-center items-center -mt-1 -ml-4 ${node.isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                {/* All */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">All</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Add', label: 'Add' },
                      { value: 'Edit', label: 'Edit' },
                      { value: 'View', label: 'View' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.all || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], all: (val as string[]) as CRMPermissionValue['all'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>
                {/* Team */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">Team</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Add', label: 'Add' },
                      { value: 'Edit', label: 'Edit' },
                      { value: 'View', label: 'View' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.team || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], team: (val as string[]) as CRMPermissionValue['team'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>
                {/* Self */}
                <div className="flex flex-col">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">Self</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Add', label: 'Add' },
                      { value: 'Edit', label: 'Edit' },
                      { value: 'View', label: 'View' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.self || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], self: (val as string[]) as CRMPermissionValue['self'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>
              </div>
            )}
            {/* Upload-only permission dropdown (Admin -> Users, Products) */}
            {showUploadOnly && (
              <div className={`grid grid-cols-1 gap-3 w-[520px] self-center items-center -mt-1 -ml-4 ${node.isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                <div className="flex flex-col w-[160px]">
                  <span className="text-xs text-blue-500 mb-0.5 leading-none">Upload</span>
                  <Select
                    size="small"
                    placeholder="Select"
                    options={[
                      { value: 'Bulk Add', label: 'Bulk Add' },
                      { value: 'Bulk Edit', label: 'Bulk Edit' },
                      { value: 'Bulk Upload', label: 'Bulk Upload' },
                    ]}
                    multiple
                    value={crmPerms[node.menuId]?.upload || []}
                    disabled={!node.isSelected}
                    onChange={(val) => {
                      const next: CRMPermissionsMap = {
                        ...crmPerms,
                        [node.menuId]: { ...crmPerms[node.menuId], upload: (val as string[]) as CRMPermissionValue['upload'] }
                      };
                      setCrmPerms(next);
                      onCRMPermissionsChange && onCRMPermissionsChange(next);
                    }}
                    className="min-w-[110px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && node.isExpanded && (
          <div className="children">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading menus...</span>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        No menu items available
      </div>
    );
  }

  return (
    <div className="menu-tree-container bg-white">
      <div className="menu-tree">
        {treeData.map(node => renderTreeNode(node))}
      </div>
    </div>
  );
};

export default MenuTreeView;
