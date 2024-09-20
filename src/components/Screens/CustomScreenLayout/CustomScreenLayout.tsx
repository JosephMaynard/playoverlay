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
      className="absolute left-0 top-0 h-full w-full bg-contain bg-center bg-no-repeat"
    />
  ) : null;
}
