import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TelegramLinking } from "../TelegramLinking";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({
        user: { id: "test-uuid", email: "test@example.com" },
        session: {},
        loading: false,
        signOut: vi.fn(),
    }),
}));

vi.mock("@/hooks/useProfile", () => ({
    useProfile: vi.fn(),
    useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useProfile } from "@/hooks/useProfile";

// ---------------------------------------------------------------------------

function renderTelegramLinking() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <TelegramLinking />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ---------------------------------------------------------------------------

describe("TelegramLinking", () => {
    it("shows 'Not linked' state when not connected", () => {
        vi.mocked(useProfile).mockReturnValue({
            data: {
                id: "u1",
                telegram_chat_id: null,
                notification_email: null,
                days_before: 3,
                timezone: "UTC",
                email_notifications: true,
                telegram_notifications: false,
                created_at: "",
            },
            isLoading: false,
            refetch: vi.fn(),
        } as never);

        renderTelegramLinking();

        expect(screen.getByText("Not linked")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Link Telegram/ }),
        ).toBeInTheDocument();
    });

    it("shows 'Linked' state when connected", () => {
        vi.mocked(useProfile).mockReturnValue({
            data: {
                id: "u1",
                telegram_chat_id: 123456789,
                notification_email: null,
                days_before: 3,
                timezone: "UTC",
                email_notifications: true,
                telegram_notifications: true,
                created_at: "",
            },
            isLoading: false,
            refetch: vi.fn(),
        } as never);

        renderTelegramLinking();

        expect(screen.getByText("Linked")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Unlink/ }),
        ).toBeInTheDocument();
    });
});
