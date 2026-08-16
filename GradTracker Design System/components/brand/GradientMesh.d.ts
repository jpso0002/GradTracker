import * as React from "react";
/**
 * The brand's atmospheric hero backdrop — required on every marketing hero.
 */
export interface GradientMeshProps {
  /** Height of the wash in px — 380–460 on desktop heroes. */
  height?: number;
  /** Dark-theme mesh stops. */
  dark?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function GradientMesh(props: GradientMeshProps): JSX.Element;
