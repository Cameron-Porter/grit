export function ProfileAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  return <img className="native-avatar" src={avatarUrl?.trim() || '/plate-icon.png'} alt="" aria-hidden="true" width={64} height={64} referrerPolicy="no-referrer"/>;
}
