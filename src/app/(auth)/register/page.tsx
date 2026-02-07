import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <div className="relative z-10">
                <RegisterForm />
            </div>
        </div>
    );
}
