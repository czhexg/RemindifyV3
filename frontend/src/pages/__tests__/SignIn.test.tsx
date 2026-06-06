import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SignIn } from "../SignIn";

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
    }),
}));

describe("SignIn", () => {
    it("renders the sign in form", () => {
        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>,
        );

        expect(screen.getByText("Remindify")).toBeInTheDocument();
        expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Sign In/ }),
        ).toBeInTheDocument();
    });

    it("has a link to the sign up page", () => {
        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>,
        );

        const signUpLink = screen.getByText("Sign up");
        expect(signUpLink).toBeInTheDocument();
        expect(signUpLink.closest("a")).toHaveAttribute("href", "/signup");
    });
});
