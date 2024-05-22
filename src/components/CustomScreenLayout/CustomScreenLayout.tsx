export interface Props {
  active: boolean;
  customScreenImageUrl?: string;
}

export default function CustomScreenLayout({
  active,
  customScreenImageUrl,
}: Props) {
  return active ? (
    <div
      style={{
        backgroundImage: `url("${customScreenImageUrl}")`,
      }}
      className="h-full bg-contain bg-center bg-no-repeat"
    />
  ) : null;
}
