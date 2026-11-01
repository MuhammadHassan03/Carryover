import icon from "../assets/icon.svg";

// The Carryover mark: a moving box whose tape peels off into an arrow.
// Same file as the landing page's brand icon.
export function Logo({ size = 30 }: { size?: number }) {
  return <img src={icon} width={size} height={size} alt="" aria-hidden="true" style={{ display: "block" }} />;
}
