interface ToasterProps {}

export function Toaster({}: ToasterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toast notifications will be rendered here */}
    </div>
  );
}
