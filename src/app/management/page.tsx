// Management Page — full implementation in issue #7
export default function ManagementPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">You&apos;re connected!</h1>
        <p className="text-gray-500 text-sm">
          Your BambooHR time-off and holidays are syncing to Google Calendar daily.
        </p>
      </div>
    </div>
  );
}
