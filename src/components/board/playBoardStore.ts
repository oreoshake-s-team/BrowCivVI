import { create } from "zustand";
import {
  initialPlayBoardState,
  playBoardReducer,
  type PlayBoardAction,
  type PlayBoardState,
} from "./playBoardState";

export interface PlayBoardStore extends PlayBoardState {
  readonly dispatch: (action: PlayBoardAction) => void;
}

export const usePlayBoardStore = create<PlayBoardStore>((set) => ({
  ...initialPlayBoardState(null),
  dispatch: (action) => {
    set((state) => playBoardReducer(state, action));
  },
}));
