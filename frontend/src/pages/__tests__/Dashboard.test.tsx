import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../Dashboard";

// ---------------------------------------------------------------------------
// Mock useAuth — always return an authenticated user
// ---------------------------------------------------------------------------

const mockUser = { id: "test-uuid", email: "test@example.com" };

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({
        user: mockUser,
        session: {},
        loading: false,
        signOut: vi.fn(),
    }),
}));

// ---------------------------------------------------------------------------
// Mock useBirthdays — we control the return value per test
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useBirthdays", async () => {
    const actual = await vi.importActual("@/hooks/useBirthdays");
    return {
        ...actual,
        useBirthdays: vi.fn(),
        useCreateBirthday: () => ({ mutate: vi.fn(), isPending: false }),
        useUpdateBirthday: () => ({ mutate: vi.fn(), isPending: false }),
        useDeleteBirthday: () => ({ mutate: vi.fn(), isPending: false }),
    };
});

import { useBirthdays } from "@/hooks/useBirthdays";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDashboard() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ---------------------------------------------------------------------------

describe("Dashboard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows loading skeletons while fetching", () => {
        vi.mocked(useBirthdays).mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            refetch: vi.fn(),
        } as never);

        renderDashboard();

        // Loading skeletons — pulse animation divs
        const skeletons = document.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows empty state when no birthdays", () => {
        vi.mocked(useBirthdays).mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        } as never);

        renderDashboard();

        expect(screen.getByText(/No birthdays yet/)).toBeInTheDocument();
        expect(screen.getByText(/Add your first one/)).toBeInTheDocument();
    });

    it("shows error state with retry button", () => {
        const refetch = vi.fn();
        vi.mocked(useBirthdays).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            refetch,
        } as never);

        renderDashboard();

        expect(
            screen.getByText(/Failed to load birthdays/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Try again/ }),
        ).toBeInTheDocument();
    });

    it("renders birthday cards when data is loaded", () => {
        vi.mocked(useBirthdays).mockReturnValue({
            data: [
                {
                    id: "1",
                    user_id: "u1",
                    name: "Alice",
                    month: 6,
                    day: 15,
                    created_at: "",
                },
                {
                    id: "2",
                    user_id: "u1",
                    name: "Bob",
                    month: 12,
                    day: 25,
                    created_at: "",
                },
            ],
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        } as never);

        renderDashboard();

        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });
});
