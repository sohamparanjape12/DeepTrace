import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — DeepTrace",
  description: "Sign in to DeepTrace to manage your media IP protection.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
