import './Preview.css';

export interface Props {
  children: React.ReactNode;
  keyColour: string;
}

export default function Preview({ children, keyColour }: Props) {
  return (
    <div className="bg-black">
      <div
        className="Preview relative mx-auto aspect-video max-w-3xl"
        style={{ backgroundColor: keyColour }}
      >
        {children}
      </div>
    </div>
  );
}
