type Props = {
  style?: unknown;
};

// react-native-google-cast ships a native view that calls
// requireNativeComponent at module load time — react-native-web has no
// implementation for that, so simply importing the library crashes the web
// bundle before cast-button.tsx's own runtime "is this supported" check
// ever runs. Metro picks this .web.tsx file over cast-button.tsx for web
// builds, so that import never happens there; Cast is a TV/mobile-only
// feature anyway.
export function CastButton(_props: Props) {
  return null;
}
