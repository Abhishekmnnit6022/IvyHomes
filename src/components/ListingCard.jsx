// Reusable listing preview; all display corrections live in format utilities.
import { areaSqft, listingPrice, money, titleCase } from '../lib/format';

// Show a property summary and delegate navigation/save events to its parent.
export function ListingCard({ listing, isSaved, onSave, onOpen }) {
  return <article className="card">
    <div className="card-top">
      <span>{titleCase(listing.locality)}</span>
      <button className={isSaved ? 'heart saved' : 'heart'} onClick={() => onSave(listing.listing_id)} aria-label="Save listing">♥</button>
    </div>
    <h3>{listing.apartment_name}</h3>
    <p>{listing.bedroom} BHK · {titleCase(listing.property_type)} · {listing.furnishing}</p>
    <strong>{money(listingPrice(listing))}</strong>
    <p className="muted">{areaSqft(listing.carpet_area).toLocaleString('en-IN')} sq ft carpet</p>
    {!listing.is_live && <span className="badge">Not live</span>}
    <button className="text-button" onClick={() => onOpen(listing.listing_id)}>View listing →</button>
  </article>;
}
