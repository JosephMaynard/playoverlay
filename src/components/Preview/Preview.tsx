import './Preview.css';

export interface Props {
  children: React.ReactNode;
  keyColour: string;
}

export default function Preview({ children, keyColour }: Props) {
  return (
    <>
      <div className="fixed z-50 mb-4 w-full bg-black shadow-lg lg:relative lg:z-auto lg:aspect-auto lg:shadow-none lg:[maxHeight:none]">
        <div
          className="Preview relative mx-auto aspect-video overflow-hidden lg:max-w-4xl"
          style={{ backgroundColor: keyColour }}
        >
          {children}
        </div>
      </div>
      <div className="mb-4 aspect-video lg:hidden" />
    </>
  );
}
