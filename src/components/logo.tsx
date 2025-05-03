import * as React from 'react'; 
type ImageProps = React.ComponentPropsWithoutRef<'img'>;

export function Logo(props: ImageProps) {
  return (
    <img
      src="/logo_symbol.png" // Path relative to the public folder
      alt="LiqTheNit Logo Symbol" // Descriptive alt text
      // Spread props to allow className, style, width, height etc.
      {...props}
    />
  );
}