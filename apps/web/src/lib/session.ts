import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/** localStorage can throw (private windows, blocked storage); the app must still work. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

interface SessionState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useSession = create<SessionState>()(
  persist((set) => ({ token: null, setToken: (token) => set({ token }) }), {
    name: "neighbourly-session",
    storage: createJSONStorage(() => safeLocalStorage),
  }),
);

export const getToken = () => useSession.getState().token;
