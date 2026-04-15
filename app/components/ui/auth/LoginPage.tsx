import AuthPageShell from "./AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell
      role="user"
      redirectPath="/user"
      sidebarTitle="Your access, on-chain"
      sidebarSubtitle="Connect with wallet, email, or social to enter your dashboard securely."
      mobileTitle="SOLTix"
      mobileSubtitle="Your access, on-chain"
    />
  );
}