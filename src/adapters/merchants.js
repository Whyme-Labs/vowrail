// Synthetic pricing agents for a reproducible hackathon demo.
// Not real businesses, not actual sellers or contractual offers.
const scripted = [
  { id: 'atlas-print', name: 'Atlas Print (simulated)', first: 23500, second: 20700, days: 2 },
  { id: 'birch-studio', name: 'Birch Studio (simulated)', first: 21600, second: 20300, days: 3 },
  { id: 'cobalt-press', name: 'Cobalt Press (simulated)', first: 22800, second: 20100, days: 4 }
];
export const simulatedMerchants = scripted.map(seller => Object.freeze({
  id: seller.id,
  name: seller.name,
  async quote(request) {
    // This adapter only consumes public requirements, not the mandate's secret ceiling.
    return {
      currency: 'USD',
      amountMinor: request.round === 1 ? seller.first : seller.second,
      deliveryDays: seller.days,
      description: '100-unit custom matte print run, all demo charges included. Synthetic estimate, not binding.'
    };
  }
}));
