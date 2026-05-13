export const ENDPOINT = "https://graphql.frankenergie.nl/";

export const QUERY = /* GraphQL */ `
  query MarketPrices($startDate: Date!, $endDate: Date!) {
    marketPricesElectricity(startDate: $startDate, endDate: $endDate) {
      from
      till
      marketPrice
      marketPriceTax
      sourcingMarkupPrice
      energyTaxPrice
    }
    marketPricesGas(startDate: $startDate, endDate: $endDate) {
      from
      till
      marketPrice
      marketPriceTax
      sourcingMarkupPrice
      energyTaxPrice
    }
  }
`;

export async function fetchMarketPrices(
  startDate: string,
  endDate: string,
): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { startDate, endDate } }),
  });
  if (!res.ok) {
    throw new Error(
      `Frank Energie API HTTP ${res.status}: ${await res.text()}`,
    );
  }
  return res.json();
}
