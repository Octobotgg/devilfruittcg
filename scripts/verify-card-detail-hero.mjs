import process from "node:process";

const [, , baseUrlArg = "http://127.0.0.1:3000", cardPathArg = "/cards/OP15-008"] = process.argv;
const baseUrl = baseUrlArg.replace(/\/$/, "");
const cardPath = cardPathArg.startsWith("/") ? cardPathArg : `/${cardPathArg}`;

function expect(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function fetchText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      "user-agent": "DevilFruitTCG Card Hero Verifier",
    },
  });

  return {
    status: response.status,
    text: await response.text(),
  };
}

async function main() {
  const failures = [];
  const page = await fetchText(cardPath);

  expect(page.status === 200, `Expected ${cardPath} to return 200, received ${page.status}`, failures);
  expect(/data-card-breadcrumb/i.test(page.text), "Card detail page should render the breadcrumb bar", failures);
  expect(/data-card-hero/i.test(page.text), "Card detail page should render the card hero wrapper", failures);
  expect(/data-card-identity-panel/i.test(page.text), "Card detail page should render the identity panel", failures);
  expect(/data-card-image/i.test(page.text), "Card detail page should render the card image in the hero", failures);
  expect(/Back to Market/i.test(page.text), "Card detail page should still render the market back action", failures);
  expect(/Official Release/i.test(page.text), "Card detail page should still render the official release action when available", failures);
  expect(/Print Variants/i.test(page.text), "Card detail page should still render print variants", failures);
  expect(/Effect \/ Ability/i.test(page.text), "Card detail page should still render the effect block", failures);
  expect(!/rounded-\[32px\] border border-\[#F0C040\]\/20/i.test(page.text), "Card detail page is still using the old hero panel styling", failures);

  if (failures.length) {
    console.error("Card detail hero verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Card detail hero verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
