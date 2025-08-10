import { UserFocusedLayout } from '../../components/app/UserFocusedLayout';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserFocusedLayout>{children}</UserFocusedLayout>;
}

export const metadata = {
  title: "EthIndexer App - AI-Powered Blockchain APIs",
  description: "Create and manage your blockchain API endpoints",
};