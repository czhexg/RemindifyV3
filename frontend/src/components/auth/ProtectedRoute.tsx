import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading…</div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/signin" replace />;
    }

    return <Outlet />;
}
