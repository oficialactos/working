declare module "lucide-react-native/dist/cjs/icons/*" {
  import type { ComponentType } from "react";

  const Icon: ComponentType<{
    color?: string;
    fill?: string;
    size?: number | string;
    strokeWidth?: number;
  }>;

  export default Icon;
}
