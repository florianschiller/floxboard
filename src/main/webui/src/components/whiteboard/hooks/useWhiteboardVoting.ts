import { useState, useCallback, useMemo } from 'react';
import { Editor } from '@dgmjs/core';
import { WhiteboardVotingConfig, ShapeVote, DEFAULT_VOTING_CONFIG } from '@/types/voting';
import { getUserColor } from '@/lib/useWhiteboardCollab';
import { YjsDgmBinding } from '@/lib/yjs-dgm-binding';

export interface UseWhiteboardVotingProps {
  editorRef: React.RefObject<Editor | null>;
  bindingRef: React.RefObject<YjsDgmBinding | null>;
  previewSnapshotRef: React.RefObject<any>;
  user: any;
  triggerAutoSave: () => void;
  setToastMessage: (msg: string | null) => void;
}

export function useWhiteboardVoting({
  editorRef,
  bindingRef,
  previewSnapshotRef,
  user,
  triggerAutoSave,
  setToastMessage,
}: UseWhiteboardVotingProps) {
  const [votingConfig, setVotingConfig] = useState<WhiteboardVotingConfig>(DEFAULT_VOTING_CONFIG);
  const [votingTick, setVotingTick] = useState(0);

  // Derive total votes cast by current user across all shapes
  const userVotesUsed = useMemo(() => {
    if (!editorRef.current) return 0;
    const currentUserId = user?.profile?.sub || 'user-local';
    const store = editorRef.current.store as any;
    const shapesMap = store?.idIndex || {};
    let total = 0;
    Object.values(shapesMap).forEach((shape: any) => {
      if (shape && Array.isArray(shape.customData?.votes)) {
        total += shape.customData.votes.filter((v: any) => v.userId === currentUserId).length;
      }
    });
    return total;
  }, [votingTick, editorRef, user]);

  const handleVote = useCallback((shapeId: string, categoryId?: string) => {
    if (!editorRef.current || previewSnapshotRef.current) return;
    if (votingConfig.isLocked) {
      setToastMessage("Voting is locked by the facilitator.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (userVotesUsed >= votingConfig.maxVotesPerUser) {
      setToastMessage(`Vote limit reached (${votingConfig.maxVotesPerUser}/${votingConfig.maxVotesPerUser}).`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const store = editorRef.current.store as any;
    const shape = store?.idIndex?.[shapeId];
    if (!shape) return;

    const currentUserId = user?.profile?.sub || 'user-local';
    const currentUserName = user?.profile?.name || user?.profile?.preferred_username || user?.profile?.email || 'Anonymous';
    const existingVotes: ShapeVote[] = Array.isArray(shape.customData?.votes) ? shape.customData.votes : [];

    if (votingConfig.allowDuplicateVotes === false && existingVotes.some((v) => v.userId === currentUserId)) {
      setToastMessage("Duplicate votes on the same shape are not allowed.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const chosenCategoryId = categoryId || votingConfig.categories[0]?.id || 'cat-priority';

    const newVote: ShapeVote = {
      id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: currentUserId,
      userName: currentUserName,
      userColor: getUserColor(currentUserId),
      categoryId: chosenCategoryId,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    };

    shape.customData = {
      ...(shape.customData || {}),
      votes: [...existingVotes, newVote],
    };

    setVotingTick((t) => (t + 1) % 10000);
    editorRef.current.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [votingConfig, userVotesUsed, user, editorRef, previewSnapshotRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleRemoveVote = useCallback((shapeId: string, voteId: string) => {
    if (!editorRef.current || previewSnapshotRef.current) return;
    if (votingConfig.isLocked) {
      setToastMessage("Voting is locked by the facilitator.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const store = editorRef.current.store as any;
    const shape = store?.idIndex?.[shapeId];
    if (!shape || !Array.isArray(shape.customData?.votes)) return;

    shape.customData = {
      ...shape.customData,
      votes: shape.customData.votes.filter((v: any) => v.id !== voteId),
    };

    setVotingTick((t) => (t + 1) % 10000);
    editorRef.current.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [votingConfig, editorRef, previewSnapshotRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleUpdateVotingConfig = useCallback((newConfig: WhiteboardVotingConfig) => {
    if (previewSnapshotRef.current) return;
    setVotingConfig(newConfig);
    if (editorRef.current) {
      const doc = (editorRef.current.store as any)?.root || (editorRef.current as any).doc;
      if (doc) {
        doc.customData = {
          ...(doc.customData || {}),
          votingConfig: newConfig,
        };
      }
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  }, [editorRef, previewSnapshotRef, bindingRef, triggerAutoSave]);

  const handleResetAllVotes = useCallback(() => {
    if (!editorRef.current || previewSnapshotRef.current) return;
    const store = editorRef.current.store as any;
    const shapesMap = store?.idIndex || {};
    Object.values(shapesMap).forEach((shape: any) => {
      if (shape && shape.customData?.votes) {
        shape.customData = {
          ...shape.customData,
          votes: [],
        };
      }
    });

    setVotingTick((t) => (t + 1) % 10000);
    editorRef.current.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [editorRef, previewSnapshotRef, bindingRef, triggerAutoSave]);

  return {
    votingConfig,
    setVotingConfig,
    votingTick,
    setVotingTick,
    userVotesUsed,
    handleVote,
    handleRemoveVote,
    handleUpdateVotingConfig,
    handleResetAllVotes,
  };
}
