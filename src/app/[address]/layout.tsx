import { ScrollToTopOnRoute } from '@/components/ScrollToTopOnRoute/ScrollToTopOnRoute';

export default function AddressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollToTopOnRoute />
      {children}
    </>
  );
}
