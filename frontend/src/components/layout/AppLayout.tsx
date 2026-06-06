import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function AppLayout() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
