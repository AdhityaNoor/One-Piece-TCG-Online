/**
 * "Report a Bug" modal state, launched from MatchScreen's Paused modal.
 * Deliberately NOT part of the engine/action-dispatch system — same
 * boundary MatchChatPanel documents for chat: this is meta/diagnostic data
 * about a match, not a GameAction, so it never touches GameState,
 * validateAction, or matchStore.dispatch (project rule: "the UI must never
 * directly mutate game state" is about *game* state).
 *
 * The store owns only UI state (open/description/selected card/submit
 * status). Match context (the log, the card-play options, turn/phase,
 * matchMode/matchId) is assembled by the caller (ReportBugModal, fed by
 * MatchScreen) and passed into `submit` — mirrors profileStore.reportUser's
 * shape, where the store's method takes an already-built request body rather
 * than reaching into other stores itself.
 */
import { create } from 'zustand';
import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { MatchModeTag, SubmitBugReportRequest } from '../../../shared/support';
import type { BugReportCardOption } from '../lib/bugReportCardOptions';
import { SupportApiError, submitBugReport } from '../../multiplayer/net/supportClient';
import { useAuthStore } from './authStore';

export type BugReportSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface BugReportMatchContext {
  matchMode: MatchModeTag;
  matchId: string | null;
  turnNumber: number;
  phase: string;
  log: GameLogEntry[];
  cardOptions: BugReportCardOption[];
}

interface BugReportState {
  open: boolean;
  description: string;
  selectedCardInstanceId: string | null;
  status: BugReportSubmitStatus;
  error: string | null;

  openModal(): void;
  closeModal(): void;
  setDescription(value: string): void;
  selectCard(instanceId: string | null): void;
  submit(context: BugReportMatchContext): Promise<boolean>;
  reset(): void;
}

const MAX_DESCRIPTION_LENGTH = 2000;

export const useBugReportStore = create<BugReportState>((set, get) => ({
  open: false,
  description: '',
  selectedCardInstanceId: null,
  status: 'idle',
  error: null,

  openModal() {
    set({ open: true });
  },

  closeModal() {
    set({ open: false });
  },

  setDescription(value) {
    set({ description: value.slice(0, MAX_DESCRIPTION_LENGTH) });
  },

  selectCard(instanceId) {
    set({ selectedCardInstanceId: instanceId });
  },

  async submit(context) {
    const description = get().description.trim();
    if (!description) {
      set({ status: 'error', error: 'Please describe the issue before submitting.' });
      return false;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      set({ status: 'error', error: 'You must be signed in to submit a bug report.' });
      return false;
    }

    const selectedOption = context.cardOptions.find((option) => option.cardInstanceId === get().selectedCardInstanceId) ?? null;

    const body: SubmitBugReportRequest = {
      description,
      matchMode: context.matchMode,
      matchId: context.matchId,
      turnNumber: context.turnNumber,
      phase: context.phase,
      selectedCard: selectedOption?.snapshot ?? null,
      log: context.log,
      clientVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null,
    };

    set({ status: 'submitting', error: null });
    try {
      await submitBugReport(token, body);
      set({ status: 'success' });
      return true;
    } catch (cause) {
      set({ status: 'error', error: cause instanceof SupportApiError ? cause.message : 'Could not submit the report. Please try again.' });
      return false;
    }
  },

  reset() {
    set({ description: '', selectedCardInstanceId: null, status: 'idle', error: null });
  },
}));
