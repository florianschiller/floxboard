import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useWhiteboardModals() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalInitialTab, setShareModalInitialTab] = useState<'members' | 'requests'>('members');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configModalInitialTab, setConfigModalInitialTab] = useState<'general' | 'canvas' | 'collaboration' | 'voting' | 'danger'>('general');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isLibraryDrawerOpen, setIsLibraryDrawerOpen] = useState(false);
  const [isSaveStencilModalOpen, setIsSaveStencilModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [isScriptDrawerOpen, setIsScriptDrawerOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseModalFeature, setLicenseModalFeature] = useState<string | undefined>(undefined);

  // Sync URL search params for modals
  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam === 'share') {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'members' || tabParam === 'requests') {
        setShareModalInitialTab(tabParam);
      }
      setIsShareModalOpen(true);
    } else if (modalParam === 'config' || modalParam === 'settings') {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'canvas' || tabParam === 'collaboration' || tabParam === 'voting' || tabParam === 'danger' || tabParam === 'general') {
        setConfigModalInitialTab(tabParam);
      }
      setIsConfigModalOpen(true);
    } else if (modalParam === 'history') {
      setIsHistoryOpen(true);
    } else if (modalParam === 'ai') {
      setIsAiModalOpen(true);
    } else if (modalParam === 'library' || modalParam === 'stencils') {
      setIsLibraryDrawerOpen(true);
    } else if (modalParam === 'license' || modalParam === 'upgrade') {
      setLicenseModalFeature(searchParams.get('feature') || undefined);
      setIsLicenseModalOpen(true);
    }
  }, [searchParams]);

  const removeModalQueryParam = () => {
    if (searchParams.has('modal') || searchParams.has('feature') || searchParams.has('tab')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('modal');
      nextParams.delete('feature');
      nextParams.delete('tab');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    removeModalQueryParam();
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    removeModalQueryParam();
  };

  const closeHistoryDrawer = () => {
    setIsHistoryOpen(false);
    removeModalQueryParam();
  };

  const closeAiModal = () => {
    setIsAiModalOpen(false);
    removeModalQueryParam();
  };

  const closeLibraryDrawer = () => {
    setIsLibraryDrawerOpen(false);
    removeModalQueryParam();
  };

  const closeLicenseModal = () => {
    setIsLicenseModalOpen(false);
    setLicenseModalFeature(undefined);
    removeModalQueryParam();
  };

  return {
    isSaveModalOpen,
    setIsSaveModalOpen,
    isSaveAsModalOpen,
    setIsSaveAsModalOpen,
    isOpenModalOpen,
    setIsOpenModalOpen,
    isShareModalOpen,
    setIsShareModalOpen,
    shareModalInitialTab,
    setShareModalInitialTab,
    closeShareModal,
    isConfigModalOpen,
    setIsConfigModalOpen,
    configModalInitialTab,
    setConfigModalInitialTab,
    closeConfigModal,
    isHistoryOpen,
    setIsHistoryOpen,
    closeHistoryDrawer,
    isAiModalOpen,
    setIsAiModalOpen,
    closeAiModal,
    isLibraryDrawerOpen,
    setIsLibraryDrawerOpen,
    closeLibraryDrawer,
    isSaveStencilModalOpen,
    setIsSaveStencilModalOpen,
    isPropertiesModalOpen,
    setIsPropertiesModalOpen,
    isScriptDrawerOpen,
    setIsScriptDrawerOpen,
    isLicenseModalOpen,
    setIsLicenseModalOpen,
    licenseModalFeature,
    setLicenseModalFeature,
    closeLicenseModal,
  };
}
