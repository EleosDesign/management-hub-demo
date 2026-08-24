import { createContext, useContext, type ReactNode } from "react";
import type { WorkspaceId } from "./data/story";

export type AppPage =
  | "workflow-registry"
  | "platform-home"
  | "create-workflow"
  | "token-sheet"
  | "workspaces";

type NavigateFn = (page: AppPage, workspaceId?: WorkspaceId) => void;

const NavigationContext = createContext<NavigateFn | null>(null);

export function NavigationProvider({
  onNavigate,
  children,
}: {
  onNavigate: NavigateFn;
  children: ReactNode;
}) {
  return (
    <NavigationContext.Provider value={onNavigate}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigate() {
  const navigate = useContext(NavigationContext);
  if (!navigate) {
    throw new Error("useNavigate must be used within a NavigationProvider");
  }
  return navigate;
}
