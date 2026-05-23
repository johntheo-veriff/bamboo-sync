import Image from "next/image";

export function VeriffLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Veriff"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}
