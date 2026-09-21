import Resolver from '@forge/resolver';
import { getBoards, getStoryPointsFields } from './boards';
import { getSprints } from './sprints';
import { getIssues } from './issues';
import { getTeamScores } from './scores';
import { storage } from '@forge/api';
import { DimensionWeights } from '../types/scoring';

import { getSavedTeamGroups, saveTeamGroup, deleteTeamGroup, getPortfolioData, getARTSyncData } from './portfolio';
import { searchJiraUsers } from './users';

const resolver = new Resolver();

resolver.define('getStoryPointsFields', async () => {
  try {
    const fields = await getStoryPointsFields();
    return { success: true, data: fields };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('searchJiraUsers', async ({ payload }) => {
  try {
    const { query } = payload as { query: string };
    const data = await searchJiraUsers(query || '');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('getPortfolioData', async ({ payload }) => {
  try {
    const data = await getPortfolioData(payload || {});
    return { success: true, data };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('getARTSyncData', async ({ payload }) => {
  try {
    const data = await getARTSyncData(payload || {});
    return { success: true, data };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('getSavedTeamGroups', async () => {
  try {
    const data = await getSavedTeamGroups();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('saveTeamGroup', async ({ payload }) => {
  try {
    const res = await saveTeamGroup(payload);
    return { success: true, data: res };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('deleteTeamGroup', async ({ payload }) => {
  try {
    const { id } = payload as { id: string };
    const res = await deleteTeamGroup(id);
    return { success: true, data: res };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});


resolver.define('getBoards', async () => {
  try {
    return { success: true, data: await getBoards() };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('getSprints', async ({ payload }) => {
  try {
    const { boardId } = payload as { boardId: number };
    return { success: true, data: await getSprints(boardId) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('getTeamScores', async ({ payload }) => {
  try {
    const {
      boardId, boardName, boardType, sprintIds, sprintNames,
      storyPointsField, authorizedApproverId, weights,
      dateRange, evaluationPeriod, projectKey
    } = payload as {
      boardId: number; boardName: string; boardType?: string; sprintIds?: number[];
      sprintNames?: string[]; storyPointsField: string; authorizedApproverId: string;
      weights?: DimensionWeights;
      dateRange?: { startDate: string; endDate: string };
      evaluationPeriod?: string;
      projectKey?: string;
    };
    const issues = await getIssues(boardId, sprintIds || [], storyPointsField, dateRange, projectKey);
    const result = await getTeamScores(
      boardId, boardName, sprintIds || [], sprintNames || [],
      issues, storyPointsField, authorizedApproverId, weights,
      dateRange, boardType, evaluationPeriod
    );
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('getSettings', async () => {
  try {
    const settings = await storage.get('ici-settings') as Record<string, string> | undefined;
    return { success: true, data: settings || {} };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('saveSettings', async ({ payload }) => {
  try {
    await storage.set('ici-settings', payload);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

resolver.define('clearCache', async ({ payload }) => {
  try {
    const { boardId, sprintIds, dateRange } = payload as {
      boardId: number;
      sprintIds?: number[];
      dateRange?: { startDate: string; endDate: string };
    };
    const dateKey = dateRange ? `${dateRange.startDate}_${dateRange.endDate}` : 'all';
    const cacheKey = `scores-${boardId}-${[...(sprintIds || [])].sort().join('-')}-${dateKey}-default`;
    await storage.delete(cacheKey);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

export const handler = resolver.getDefinitions();
