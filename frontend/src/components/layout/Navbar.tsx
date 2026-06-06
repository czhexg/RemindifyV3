import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Cake, LogOut, Settings } from "lucide-react";

export function Navbar() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate("/signin");
    };

    return (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
                {/* Left: logo + nav */}
                <div className="flex items-center gap-6">
                    <Link
                        to="/"
                        className="flex items-center gap-2 font-semibold text-lg"
                    >
                        <Cake className="h-5 w-5" />
                        Remindify
                    </Link>
                    <nav className="hidden sm:flex items-center gap-1">
                        <Button
                            variant={
                                location.pathname === "/"
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="sm"
                            asChild
                        >
                            <Link to="/">Dashboard</Link>
                        </Button>
                        <Button
                            variant={
                                location.pathname === "/settings"
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="sm"
                            asChild
                        >
                            <Link to="/settings">
                                <Settings className="h-4 w-4 mr-1" />
                                Settings
                            </Link>
                        </Button>
                    </nav>
                </div>

                {/* Right: user + sign out */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        {user?.email}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-1" />
                        Sign out
                    </Button>
                </div>
            </div>
        </header>
    );
}
