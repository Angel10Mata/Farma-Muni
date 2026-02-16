import { Suspense } from "react";
import LoginForm from "@/components/(base)/(auth)/login/LogIn";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
