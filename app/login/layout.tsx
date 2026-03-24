import { Providers } from "@/app/components/providers";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
