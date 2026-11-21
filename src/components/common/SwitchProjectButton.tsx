import React, { useEffect, useMemo, useState } from 'react';
import SelectSystemModal, { SystemOption } from './SelectSystemModal';
import apiClient from '../../lib/services/apiClient';
import authService from '../../lib/services/authService';

interface SwitchProjectButtonProps {
  userName?: string;
  systems?: SystemOption[];
  onProceed?: (payload: { systemId: string | number; setDefault: boolean }) => void;
}

const SwitchProjectButton: React.FC<SwitchProjectButtonProps> = ({ userName = 'User', systems, onProceed }) => {
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [projectOptions, setProjectOptions] = useState<SystemOption[]>([]);
  const [defaultProjectId, setDefaultProjectId] = useState<string | number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

  // Build options from localStorage: userData -> userProject
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem('userData') || localStorage.getItem('currentUser');
      if (!raw) {
        setProjectOptions([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const userProject = parsed?.userProject || parsed?.user?.userProject || [];
      const defId = parsed?.defaultProjectId ?? parsed?.user?.defaultProjectId;
      if (defId !== undefined && defId !== null) setDefaultProjectId(defId);

      // Determine currently selected project
      const selStr = localStorage.getItem('selectedProject') || sessionStorage.getItem('selectedProject');
      let selId: number | undefined = undefined;
      if (selStr) {
        try { selId = Number(JSON.parse(selStr)); } catch { selId = Number(selStr); }
      } else {
        const cand = parsed?.selectedProjectId ?? parsed?.user?.selectedProjectId ?? defId;
        selId = cand !== undefined && cand !== null ? Number(cand) : undefined;
      }
      if (Number.isFinite(selId as number)) setSelectedProjectId(selId as number);

      if (Array.isArray(userProject)) {
        const opts: SystemOption[] = userProject.map((p: any, idx: number) => ({
          id: p.projectId ?? p.project?.projectId ?? p.id ?? idx,
          name: p.project?.projectName ?? p.projectName ?? p.name ?? p.projectCode ?? String(p.projectId ?? p.id ?? `Project ${idx + 1}`),
        }));
        setProjectOptions(opts);
      } else {
        setProjectOptions([]);
      }
    } catch (e) {
      setProjectOptions([]);
    }
  }, []);

  // If parent passes systems explicitly, they take precedence
  const effectiveOptions = useMemo<SystemOption[]>(() => {
    if (systems && systems.length > 0) return systems;
    return projectOptions;
  }, [systems, projectOptions]);

  // Fallback option if absolutely nothing found
  const fallbackOptions = useMemo<SystemOption[]>(() => {
    const email = typeof window !== 'undefined' ? (localStorage.getItem('userEmail') || 'demo@example.com') : 'demo@example.com';
    return [{ id: email, name: email }];
  }, []);

  const options = effectiveOptions.length > 0 ? effectiveOptions : fallbackOptions;

  // Visible only if more than one project is available from userData.userProject or provided systems
  const shouldShow = effectiveOptions.length > 1;

  // Handle Proceed: if set as default, call API to save default project
  const handleProceed = async ({ systemId, setDefault }: { systemId: string | number; setDefault: boolean }) => {
    setIsSwitching(true);
    try {
      if (setDefault) {
        await apiClient.post(`${process.env.NEXT_PUBLIC_API_URL}/login/api/users/saveDefaultProject?projectId=${systemId}`);
        // Optimistically update localStorage defaultProjectId
        try {
          const raw = localStorage.getItem('userData') || localStorage.getItem('currentUser');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) {
              if (parsed.user) parsed.user.defaultProjectId = systemId; else parsed.defaultProjectId = systemId;
              localStorage.setItem('userData', JSON.stringify(parsed));
            }
          }
        } catch {}
        setDefaultProjectId(systemId);
      }

      // Always refresh menu and switch project context using assignedWebMenus API
      const pid = Number(systemId);
      try {
        // Invalidate cached menu and labels so authService doesn't return stale storage
        localStorage.removeItem('userMenu');
        sessionStorage.removeItem('userMenu');
        localStorage.removeItem('singularName');
        localStorage.removeItem('pluralName');
      } catch {}

      // Persist selectedProject for cross-app consistency
      try {
        localStorage.setItem('selectedProject', JSON.stringify(pid));
        sessionStorage.setItem('selectedProject', JSON.stringify(pid));
      } catch {}

      await authService.getUserMenu(pid);
      // Update auth service selected project so any consumers reading it reactively get the new ID
      try {
        authService.updateSelectedProject({ id: pid, projectId: pid, projectName: options.find(o => Number(o.id) === pid)?.name });
      } catch {}

      // Update lightweight selected project id in userData for quick checks
      try {
        const raw = localStorage.getItem('userData') || localStorage.getItem('currentUser');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            if (parsed.user) parsed.user.selectedProjectId = pid; else parsed.selectedProjectId = pid;
            localStorage.setItem('userData', JSON.stringify(parsed));
          }
        }
      } catch {}

      // Refresh the app to load UI with the switched project context
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save default project', e);
      setIsSwitching(false);
    } finally {
      // propagate to parent if provided
      onProceed?.({ systemId, setDefault });
    }
  };

  return (
    <>
      {!shouldShow ? null : (
      <button
        aria-label="Switch Project"
        title="Switch Project"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg  bg-white hover:bg-blue-100 "
      >
        {/* Colorful 2x2 rounded squares icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <rect x="0" y="0" width="24" height="24" fill="none"></rect>
            {/* Top-left (primary blue) */}
            <rect x="4" y="4" width="7" height="7" rx="2" fill="#3B82F6"></rect>
            {/* Top-right (light blue) */}
            <rect x="13" y="4" width="7" height="7" rx="2" fill="#93C5FD"></rect>
            {/* Bottom-left (medium blue) */}
            <rect x="4" y="13" width="7" height="7" rx="2" fill="#60A5FA"></rect>
            {/* Bottom-right (very light blue) */}
            <rect x="13" y="13" width="7" height="7" rx="2" fill="#BFDBFE"></rect>
          </g>
        </svg>
      </button>
      )}

      <SelectSystemModal
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        systems={options}
        onProceed={handleProceed}
        defaultSystemId={
          defaultProjectId !== undefined && defaultProjectId !== null
            ? defaultProjectId
            : options[0]?.id
        }
        initialSelectedId={
          (selectedProjectId !== undefined && selectedProjectId !== null)
            ? selectedProjectId
            : (defaultProjectId !== undefined && defaultProjectId !== null ? defaultProjectId : options[0]?.id)
        }
      />

      {isSwitching && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-2xl">
            <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-sm font-medium text-gray-700">Switching project...</span>
          </div>
        </div>
      )}
    </>
  );
};

export default SwitchProjectButton;
