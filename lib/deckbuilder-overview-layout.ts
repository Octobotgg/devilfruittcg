export type OverviewDistributionItem = {
  label: string;
  count: number;
  percent: number;
};

export type OverviewPowerBucket = {
  label: string;
  averagePower: number;
  copies: number;
};

export type OverviewSectionLayout = {
  colorSplitMode: "compact" | "full";
  typeSplitMode: "compact" | "full";
  averagePowerMode: "compact" | "full";
};

type OverviewSectionLayoutInput = {
  colorDistribution: OverviewDistributionItem[];
  typeDistribution: OverviewDistributionItem[];
  powerByCost: OverviewPowerBucket[];
};

export function getCompactCurveBarHeight(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) return 6;
  return Math.max(6, Math.round((count / maxCount) * 34));
}

export function getOverviewSectionLayout(
  input: OverviewSectionLayoutInput,
): OverviewSectionLayout {
  const activeColorBuckets = input.colorDistribution.filter((item) => item.count > 0).length;
  const activeTypeBuckets = input.typeDistribution.filter((item) => item.count > 0).length;
  const activePowerBuckets = input.powerByCost.filter((item) => item.copies > 0).length;

  return {
    colorSplitMode: activeColorBuckets <= 1 ? "compact" : "full",
    typeSplitMode: activeTypeBuckets <= 1 ? "compact" : "full",
    averagePowerMode: activePowerBuckets <= 1 ? "compact" : "full",
  };
}
