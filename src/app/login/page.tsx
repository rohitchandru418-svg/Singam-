import type { Metadata } from "next";
import { LoginScreen } from "@/components/LoginScreen";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Startup Singam operations ERP with your email address or mobile number.",
};

export default function LoginPage() {
  return <LoginScreen />;
}
