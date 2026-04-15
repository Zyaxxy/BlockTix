import AuthPageShell from "./AuthPageShell";

export default function OrganizerLoginPage() {
  return (
    <AuthPageShell
      role="organizer"
      redirectPath="/organizer"
      sidebarTitle="Organizer access, on-chain"
      sidebarSubtitle="Connect to create, manage, and launch on-chain events with verifiable tickets."
      mobileTitle="BlockTix"
      mobileSubtitle="Organizer access, on-chain"
    />
  );
}