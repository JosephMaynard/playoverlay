export interface Props {
  teamName: string;
  textColour: string;
  backgroundColour: string;
}

export default function ScoresTeamName({
  teamName,
  textColour,
  backgroundColour,
}: Props) {
  return (
    <div
      className="ScoresLayout_item font-bold"
      style={{
        color: textColour,
        backgroundColor: backgroundColour,
      }}
    >
      {teamName}
    </div>
  );
}
