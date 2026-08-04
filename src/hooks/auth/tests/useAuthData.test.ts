import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  auth: {
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  },
  upsert: vi.fn(),
  calls: {
    from: [] as string[],
  },
}));

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        resetPasswordForEmail: (...args: unknown[]) => mockState.auth.resetPasswordForEmail(...args),
        updateUser: (...args: unknown[]) => mockState.auth.updateUser(...args),
        signInWithPassword: (...args: unknown[]) => mockState.auth.signInWithPassword(...args),
        signUp: (...args: unknown[]) => mockState.auth.signUp(...args),
      },
      from: (table: string) => {
        mockState.calls.from.push(table);
        return {
          upsert: (...args: unknown[]) => mockState.upsert(...args),
        };
      },
    },
  };
});

import { useAuthData } from "@/hooks/auth/useAuthData";

describe("useAuthData", () => {
  beforeEach(() => {
    mockState.auth.resetPasswordForEmail.mockReset();
    mockState.auth.updateUser.mockReset();
    mockState.auth.signInWithPassword.mockReset();
    mockState.auth.signUp.mockReset();
    mockState.upsert.mockReset();
    mockState.calls.from = [];

    mockState.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    mockState.auth.updateUser.mockResolvedValue({ error: null });
    mockState.auth.signInWithPassword.mockResolvedValue({ error: null });
    mockState.auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockState.upsert.mockResolvedValue({ error: null });
  });

  it("requestPasswordReset transmet email et redirect", async () => {
    const { result } = renderHook(() => useAuthData());

    await result.current.requestPasswordReset("mage@test.com", "https://spellbound.app");

    expect(mockState.auth.resetPasswordForEmail).toHaveBeenCalledWith("mage@test.com", {
      redirectTo: "https://spellbound.app",
    });
  });

  it("updateUserPassword transmet le password", async () => {
    const { result } = renderHook(() => useAuthData());

    await result.current.updateUserPassword("Secr3t!!");

    expect(mockState.auth.updateUser).toHaveBeenCalledWith({ password: "Secr3t!!" });
  });

  it("signInWithPassword transmet les identifiants", async () => {
    const { result } = renderHook(() => useAuthData());

    await result.current.signInWithPassword("hero@test.com", "123456");

    expect(mockState.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "hero@test.com",
      password: "123456",
    });
  });

  it("signUpWithPassword injecte pseudo + role player", async () => {
    const { result } = renderHook(() => useAuthData());

    await result.current.signUpWithPassword({
      email: "new@test.com",
      password: "abcdef",
      pseudo: "Arkan",
    });

    expect(mockState.auth.signUp).toHaveBeenCalledWith({
      email: "new@test.com",
      password: "abcdef",
      options: {
        data: {
          pseudo: "Arkan",
          role: "player",
        },
      },
    });
  });

  it("upsertUserProfile ecrit dans utilisateurs", async () => {
    const { result } = renderHook(() => useAuthData());

    await result.current.upsertUserProfile("u77", "Selene");

    expect(mockState.calls.from).toContain("utilisateurs");
    expect(mockState.upsert).toHaveBeenCalledWith({
      id: "u77",
      pseudo: "Selene",
      role: "joueur",
    });
  });
});
