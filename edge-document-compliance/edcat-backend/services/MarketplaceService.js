const sampleListings = [
  {
    id: 'tmpl-exec-summary',
    type: 'template',
    title: 'Executive Summary Template',
    description: 'Pre-built executive summary layout for export.',
    category: 'reporting',
    pricing_type: 'free',
    install_count: 12
  }
];

class MarketplaceService {
  async listListings() {
    return sampleListings;
  }

  async installListing(listingId) {
    const item = sampleListings.find((listing) => listing.id === listingId);
    if (!item) {
      throw new Error('Listing not found');
    }
    item.install_count += 1;
    return { installed: true };
  }
}

export default new MarketplaceService();
