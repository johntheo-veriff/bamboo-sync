export function UserAvatar({ email }: { email: string }) {
  const initials = email.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-end gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials}
        </span>
        <span className="text-sm text-gray-500">{email}</span>
      </div>
      <a
        href="/api/auth/google/logout"
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Log out
      </a>
    </div>
  );
}
