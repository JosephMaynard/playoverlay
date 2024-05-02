import './Preview.css';

export interface Props {
  children: React.ReactNode;
  keyColour: string;
}

export default function Preview({ children, keyColour }: Props) {
  return (
    <>
      <div className="fixed z-50 mb-4 w-full overflow-hidden bg-black shadow-lg lg:relative lg:z-auto lg:grid lg:h-full lg:w-full lg:shadow-none lg:[maxHeight:none]">
        <div
          className="Preview relative inset-0 m-auto aspect-video h-auto max-h-full w-auto max-w-lg overflow-hidden md:max-w-2xl lg:absolute lg:max-w-full"
          style={{ backgroundColor: keyColour }}
        >
          {children}
        </div>
      </div>
      <div className="mb-4 aspect-video max-w-lg md:max-w-2xl lg:hidden lg:max-w-full" />
    </>
  );
}
