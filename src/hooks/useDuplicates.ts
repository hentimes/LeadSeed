import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { findUserDuplicatePairs, mergeDuplicateLeadPair, type DuplicatePair } from '../services/duplicatesService';
import type { Lead } from '../types';

export function useDuplicates() {
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [mergeMsg, setMergeMsg] = useState('');

  const findDuplicates = useCallback(async () => {
    if (!user) return;
    setDuplicates(await findUserDuplicatePairs(user.id));
  }, [user]);

  const mergeLeads = useCallback(async (lead1: Lead, lead2: Lead) => {
    await mergeDuplicateLeadPair(lead1, lead2);
    setMergeMsg(`Unidos: ${lead2.name} -> ${lead1.name}`);
    setTimeout(() => setMergeMsg(''), 3000);
    await findDuplicates();
  }, [findDuplicates]);

  return {
    duplicates,
    mergeMsg,
    findDuplicates,
    mergeLeads,
  };
}
