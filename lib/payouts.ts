import { formatCurrency } from "@/lib/utils";

const creatorSplit = parseFloat(process.env.CREATOR_SPLIT_PERCENT ?? "0.89");
const communitySplit = parseFloat(process.env.COMMUNITY_SPLIT_PERCENT ?? "0.10");
const platformSplit = parseFloat(process.env.PLATFORM_SPLIT_PERCENT ?? "0.01");

export function calculateSplit(amount: number) {
  const creator = amount * creatorSplit;
  const community = amount * communitySplit;
  const platform = amount * platformSplit;
  return {
    creator,
    community,
    platform
  };
}

export function describeSplit(amount: number, currency = "USD") {
  const split = calculateSplit(amount);
  return `Creator ${formatCurrency(split.creator, currency)} · Community ${formatCurrency(
    split.community,
    currency
  )} · Platform ${formatCurrency(split.platform, currency)}`;
}
