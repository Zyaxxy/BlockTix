import { Providers } from "@/app/components/providers";

export default function LogoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
