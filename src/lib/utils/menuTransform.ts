// Utility to recursively transform menu items for MainNav
export function transformMenuItems(items: any[]): any[] {
  return items.map(item => {
    // Section header
    if (item.section) {
      return { section: item.section };
    }
    return {
      title: item.title || item.menuName || item.name || 'Unnamed',
      page: item.page || item.url || item.path || '#',
      root: !!item.root,
      icon: item.icon || '',
      bullet: item.bullet || '',
      menuId: item.menuId || item.id,
      parentMenuId: item.parentMenuId || item.parentId || item.parent_id || null,
      hasChild: item.hasChild || (Array.isArray(item.submenu) && item.submenu.length > 0 ? 1 : 0),
      menuPermission: item.menuPermission || [],
      singularName: item.singularName || null,
      pruralName: item.pruralName || null,
      defaultMenuName: item.defaultMenuName || null,
      alignment: item.alignment || null,
      toggle: item.toggle || null,
      section: item.section || null,
      // Recursively process submenus
      submenu: Array.isArray(item.submenu) ? transformMenuItems(item.submenu) : null,
      // Keep any other properties for future-proofing
      ...item
    };
  });
}
