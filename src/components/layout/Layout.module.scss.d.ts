// customer banner
export type Styles = {
  'container': string;
  'footer': string;
  'main': string;
};

export type TheClasses = keyof Styles;

declare const styles: Styles;

export default styles;
