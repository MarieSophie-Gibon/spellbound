import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabase.from(...args),
    channel: (...args: unknown[]) => mockSupabase.channel(...args),
  },
}));

import { useCombatDashboardData } from "@/hooks/scenarios/useCombatDashboardData";

describe("useCombatDashboardData", () => {
  it("exposes the combat dashboard API expected by the scenario UI", () => {
    const { result } = renderHook(() => useCombatDashboardData());

    expect(typeof result.current.fetchChapitreCombatAndContent).toBe("function");
    expect(typeof result.current.updateChapitreCombatState).toBe("function");
    expect(typeof result.current.searchMonsters).toBe("function");
    expect(typeof result.current.searchNpcs).toBe("function");
    expect(typeof result.current.subscribeChapitreCombatState).toBe("function");
  });
});
