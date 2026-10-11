/**
 * A model-driven SYNTHETIC merchant. It sees only the gateway's public
 * request, plus its own merchant-side pricing policy. NOT a real business.
 */
export function createAIMerchant(ai, {
  id = 'birch-ai',
  name = 'Birch AI Studio (simulated)',
  floorMinor = 18500,
  ceilingMinor = 24500,
  deliveryDays = 3
} = {}) {
  if (!ai?.isConfigured?.()) throw new Error('A configured model is required for an AI merchant');
  return {
    id, name, mode: 'ai',
    async quote(publicRequest) {
      const sellerTerms = {
        floorMinor, ceilingMinor, deliveryDays,
        baselineMinor: publicRequest.round === 1 ? 21600 : 20300
      };
      const proposal = await ai.quoteAsMerchant({ publicRequest: { ...publicRequest }, sellerTerms });
      if (!proposal || !Number.isSafeInteger(proposal.amountMinor)
        || proposal.amountMinor < floorMinor || proposal.amountMinor > ceilingMinor
        || proposal.currency !== 'USD'
        || !Number.isSafeInteger(proposal.deliveryDays)
        || proposal.deliveryDays < 0 || proposal.deliveryDays > 30
        || typeof proposal.description !== 'string' || proposal.description.trim().length < 1
        || proposal.description.length > 200) {
        throw new Error('Model returned a quote outside merchant-side constraints');
      }
      return {
        amountMinor: proposal.amountMinor, currency: 'USD',
        deliveryDays: proposal.deliveryDays, description: proposal.description
      };
    }
  };
}
