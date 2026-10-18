import './Preview.css';

export interface Props {
  children: React.ReactNode;
  keyColour: string;
}

export default function Preview({ children, keyColour }: Props) {
  return (
    <>
      <div className="fixed z-50 mb-4 w-full overflow-hidden bg-black shadow-lg lg:relative lg:z-auto lg:mb-0 lg:aspect-video lg:h-auto lg:w-full lg:overflow-hidden lg:rounded-xl lg:bg-transparent lg:shadow-none lg:ring-1 lg:ring-line">
        <div
          className="Preview relative inset-0 m-auto aspect-video h-auto max-h-full w-auto max-w-lg overflow-hidden lg:absolute lg:h-full lg:w-full lg:max-w-none"
          style={{ backgroundColor: keyColour }}
        >
          {children}
        </div>
      </div>
      <div className="mb-4 aspect-video max-w-lg lg:hidden lg:max-w-full" />
    </>
  );
}
