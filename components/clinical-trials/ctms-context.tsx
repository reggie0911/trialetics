'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type CTMSModule = 'home' | 'project' | 'country' | 'sites' | 'enrollment' | 'finance' | 'administration';

export interface SelectedProject {
  id: string;
  name: string;
  protocol_number: string;
  status: string;
}

export interface SelectedCountry {
  id: string;
  name: string;
}

export interface SelectedSite {
  id: string;
  site_number: string | null;
  organization_name: string | null;
}

interface CTMSContextValue {
  activeModule: CTMSModule;
  setActiveModule: (module: CTMSModule) => void;
  selectedProject: SelectedProject | null;
  setSelectedProject: (project: SelectedProject | null) => void;
  selectedCountry: SelectedCountry | null;
  setSelectedCountry: (country: SelectedCountry | null) => void;
  selectedSite: SelectedSite | null;
  setSelectedSite: (site: SelectedSite | null) => void;
  companyId: string;
  profileId: string;
  email: string;
}

const CTMSContext = createContext<CTMSContextValue | null>(null);

export function useCTMS() {
  const ctx = useContext(CTMSContext);
  if (!ctx) throw new Error('useCTMS must be used within CTMSProvider');
  return ctx;
}

function deriveModuleFromPath(pathname: string): CTMSModule {
  if (pathname.includes('/administration')) return 'administration';
  if (pathname.includes('/finance') || pathname.includes('/clinical-payments')) return 'finance';
  if (pathname.includes('/subject/')) return 'enrollment';
  if (pathname.includes('/site/')) return 'sites';
  if (pathname.includes('/country/')) return 'country';
  if (pathname.includes('/project/')) return 'project';
  return 'home';
}

interface CTMSProviderProps {
  children: ReactNode;
  companyId: string;
  profileId: string;
  email: string;
}

export function CTMSProvider({ children, companyId, profileId, email }: CTMSProviderProps) {
  const pathname = usePathname();
  const [activeModule, setActiveModule] = useState<CTMSModule>(() => deriveModuleFromPath(pathname));
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [selectedSite, setSelectedSite] = useState<SelectedSite | null>(null);

  useEffect(() => {
    setActiveModule(deriveModuleFromPath(pathname));
  }, [pathname]);

  const setProject = useCallback((project: SelectedProject | null) => {
    setSelectedProject(project);
    if (!project) {
      setSelectedCountry(null);
      setSelectedSite(null);
    }
  }, []);

  return (
    <CTMSContext.Provider
      value={{
        activeModule,
        setActiveModule,
        selectedProject,
        setSelectedProject: setProject,
        selectedCountry,
        setSelectedCountry,
        selectedSite,
        setSelectedSite,
        companyId,
        profileId,
        email,
      }}
    >
      {children}
    </CTMSContext.Provider>
  );
}
